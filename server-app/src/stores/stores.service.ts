import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Store } from '../entities/store.entity';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { ActionType } from '../common/enums/action-type.enum';

@Injectable()
export class StoresService {
  constructor(
    @InjectRepository(Store)
    private readonly storeRepo: Repository<Store>,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async create(dto: CreateStoreDto, userId: string) {
    const existing = await this.storeRepo.findOne({
      where: { name: dto.name.trim() },
    });
    if (existing) {
      throw new ConflictException('Store with this name already exists');
    }

    const store = this.storeRepo.create({
      name: dto.name.trim(),
      address: dto.address?.trim(),
      phone: dto.phone?.trim(),
    });
    const saved = await this.storeRepo.save(store);

    await this.activityLogService.log({
      user_id: userId,
      action_type: ActionType.STORE_CREATE,
      entity_type: 'Store',
      entity_id: saved.id,
      new_data: { name: saved.name, address: saved.address, phone: saved.phone },
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

    const qb = this.storeRepo
      .createQueryBuilder('store')
      .orderBy('store.created_at', 'DESC');

    if (options.is_active !== undefined) {
      qb.andWhere('store.is_active = :is_active', {
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
    const store = await this.storeRepo.findOne({ where: { id } });
    if (!store) throw new NotFoundException('Store not found');
    return store;
  }

  async update(id: string, dto: UpdateStoreDto, userId: string) {
    const store = await this.storeRepo.findOne({ where: { id } });
    if (!store) throw new NotFoundException('Store not found');

    const oldData = {
      name: store.name,
      address: store.address,
      phone: store.phone,
      is_active: store.is_active,
    };
    Object.assign(store, dto);
    const saved = await this.storeRepo.save(store);

    await this.activityLogService.log({
      user_id: userId,
      action_type: ActionType.STORE_UPDATE,
      entity_type: 'Store',
      entity_id: saved.id,
      old_data: oldData,
      new_data: {
        name: saved.name,
        address: saved.address,
        phone: saved.phone,
        is_active: saved.is_active,
      },
    });

    return saved;
  }

  async remove(id: string, userId: string) {
    const store = await this.storeRepo.findOne({ where: { id } });
    if (!store) throw new NotFoundException('Store not found');

    await this.activityLogService.log({
      user_id: userId,
      action_type: ActionType.STORE_DELETE,
      entity_type: 'Store',
      entity_id: id,
      old_data: { name: store.name, address: store.address, phone: store.phone },
    });

    await this.storeRepo.remove(store);

    return { message: 'Store deleted successfully' };
  }
}
