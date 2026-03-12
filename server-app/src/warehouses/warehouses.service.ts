import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Warehouse } from '../entities/warehouse.entity';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { ActionType } from '../common/enums/action-type.enum';

@Injectable()
export class WarehousesService {
  constructor(
    @InjectRepository(Warehouse)
    private readonly warehouseRepo: Repository<Warehouse>,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async create(dto: CreateWarehouseDto, userId: string) {
    const existing = await this.warehouseRepo.findOne({
      where: { name: dto.name.trim() },
    });
    if (existing) {
      throw new ConflictException('Warehouse with this name already exists');
    }

    const warehouse = this.warehouseRepo.create({
      name: dto.name.trim(),
      location: dto.location?.trim(),
    });
    const saved = await this.warehouseRepo.save(warehouse);

    await this.activityLogService.log({
      user_id: userId,
      action_type: ActionType.WAREHOUSE_CREATE,
      entity_type: 'Warehouse',
      entity_id: saved.id,
      new_data: { name: saved.name, location: saved.location },
    });

    return saved;
  }

  async findAll(options: {
    page?: number;
    limit?: number;
    is_active?: boolean;
  }) {
    const page = options.page || 1;
    const limit = options.limit || 20;

    const qb = this.warehouseRepo
      .createQueryBuilder('warehouse')
      .orderBy('warehouse.created_at', 'DESC');

    if (options.is_active !== undefined) {
      qb.andWhere('warehouse.is_active = :is_active', {
        is_active: options.is_active,
      });
    }

    const total = await qb.getCount();
    const data = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOne(id: string) {
    const w = await this.warehouseRepo.findOne({ where: { id } });
    if (!w) throw new NotFoundException('Warehouse not found');
    return w;
  }

  async update(id: string, dto: UpdateWarehouseDto, userId: string) {
    const warehouse = await this.warehouseRepo.findOne({ where: { id } });
    if (!warehouse) throw new NotFoundException('Warehouse not found');

    const oldData = {
      name: warehouse.name,
      location: warehouse.location,
      is_active: warehouse.is_active,
    };
    Object.assign(warehouse, dto);
    const saved = await this.warehouseRepo.save(warehouse);

    await this.activityLogService.log({
      user_id: userId,
      action_type: ActionType.WAREHOUSE_UPDATE,
      entity_type: 'Warehouse',
      entity_id: saved.id,
      old_data: oldData,
      new_data: {
        name: saved.name,
        location: saved.location,
        is_active: saved.is_active,
      },
    });

    return saved;
  }

  async remove(id: string, userId: string) {
    const warehouse = await this.warehouseRepo.findOne({ where: { id } });
    if (!warehouse) throw new NotFoundException('Warehouse not found');

    await this.activityLogService.log({
      user_id: userId,
      action_type: ActionType.WAREHOUSE_DELETE,
      entity_type: 'Warehouse',
      entity_id: id,
      old_data: { name: warehouse.name, location: warehouse.location },
    });

    await this.warehouseRepo.remove(warehouse);

    return { message: 'Warehouse deleted successfully' };
  }
}
