import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { SalesTarget } from '../entities/sales-target.entity';
import { Sale } from '../entities/sale.entity';
import { User } from '../entities/user.entity';
import { WarehouseUser } from '../entities/warehouse-user.entity';
import { CreateSalesTargetDto } from './dto/create-sales-target.dto';
import { UpdateSalesTargetDto } from './dto/update-sales-target.dto';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { ActionType } from '../common/enums/action-type.enum';
import { SaleStatus } from '../common/enums/sale-status.enum';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class SalesTargetsService {
  constructor(
    @InjectRepository(SalesTarget)
    private readonly targetRepo: Repository<SalesTarget>,
    @InjectRepository(Sale)
    private readonly saleRepo: Repository<Sale>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(WarehouseUser)
    private readonly warehouseUserRepo: Repository<WarehouseUser>,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async create(dto: CreateSalesTargetDto, managerId: string) {
    // Validate salesperson exists and has correct role
    const salesperson = await this.userRepo.findOne({
      where: {
        id: dto.salesperson_id,
        role: Role.SALESPERSON,
        is_active: true,
      },
    });
    if (!salesperson) {
      throw new NotFoundException('Salesperson not found or inactive');
    }

    // Validate salesperson is assigned to the warehouse
    const assignment = await this.warehouseUserRepo.findOne({
      where: {
        user_id: dto.salesperson_id,
        warehouse_id: dto.warehouse_id,
      },
    });
    if (!assignment) {
      throw new BadRequestException(
        'Salesperson is not assigned to this warehouse',
      );
    }

    // Validate dates
    if (new Date(dto.period_start) >= new Date(dto.period_end)) {
      throw new BadRequestException('Period start must be before period end');
    }

    const target = this.targetRepo.create({
      salesperson_id: dto.salesperson_id,
      warehouse_id: dto.warehouse_id,
      target_amount: dto.target_amount,
      period_start: new Date(dto.period_start),
      period_end: new Date(dto.period_end),
      assigned_by: managerId,
    });

    const saved = await this.targetRepo.save(target);

    // Calculate initial achieved amount
    saved.achieved_amount = await this.calculateAchieved(saved);
    await this.targetRepo.save(saved);

    await this.activityLogService.log({
      user_id: managerId,
      action_type: ActionType.SALES_TARGET_CREATE,
      entity_type: 'SalesTarget',
      entity_id: saved.id,
      new_data: {
        salesperson_id: dto.salesperson_id,
        salesperson_name: salesperson.name,
        target_amount: dto.target_amount,
        period_start: dto.period_start,
        period_end: dto.period_end,
      },
    });

    return saved;
  }

  async findAll(options: {
    page?: number;
    limit?: number;
    salesperson_id?: string;
    warehouse_id?: string;
  }) {
    const page = options.page || 1;
    const limit = options.limit || 20;

    const qb = this.targetRepo
      .createQueryBuilder('target')
      .leftJoinAndSelect('target.salesperson', 'salesperson')
      .leftJoinAndSelect('target.warehouse', 'warehouse')
      .orderBy('target.created_at', 'DESC');

    if (options.salesperson_id) {
      qb.andWhere('target.salesperson_id = :salesperson_id', {
        salesperson_id: options.salesperson_id,
      });
    }
    if (options.warehouse_id) {
      qb.andWhere('target.warehouse_id = :warehouse_id', {
        warehouse_id: options.warehouse_id,
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
    const target = await this.targetRepo.findOne({
      where: { id },
      relations: ['salesperson', 'warehouse'],
    });
    if (!target) {
      throw new NotFoundException('Sales target not found');
    }

    // Recalculate achieved amount
    target.achieved_amount = await this.calculateAchieved(target);
    await this.targetRepo.save(target);

    return target;
  }

  async update(id: string, dto: UpdateSalesTargetDto, managerId: string) {
    const target = await this.targetRepo.findOne({ where: { id } });
    if (!target) {
      throw new NotFoundException('Sales target not found');
    }

    const oldData = {
      target_amount: target.target_amount,
      period_start: target.period_start,
      period_end: target.period_end,
    };

    if (dto.period_start) target.period_start = new Date(dto.period_start);
    if (dto.period_end) target.period_end = new Date(dto.period_end);
    if (dto.target_amount !== undefined)
      target.target_amount = dto.target_amount;

    const saved = await this.targetRepo.save(target);

    await this.activityLogService.log({
      user_id: managerId,
      action_type: ActionType.SALES_TARGET_UPDATE,
      entity_type: 'SalesTarget',
      entity_id: saved.id,
      old_data: oldData,
      new_data: {
        target_amount: saved.target_amount,
        period_start: saved.period_start,
        period_end: saved.period_end,
      },
    });

    return saved;
  }

  async remove(id: string, managerId: string) {
    const target = await this.targetRepo.findOne({
      where: { id },
      relations: ['salesperson'],
    });
    if (!target) {
      throw new NotFoundException('Sales target not found');
    }

    await this.targetRepo.remove(target);

    await this.activityLogService.log({
      user_id: managerId,
      action_type: ActionType.SALES_TARGET_DELETE,
      entity_type: 'SalesTarget',
      entity_id: id,
      old_data: {
        salesperson_id: target.salesperson_id,
        target_amount: target.target_amount,
      },
    });

    return { message: 'Sales target deleted successfully' };
  }

  async getMyTargets(salespersonId: string) {
    const targets = await this.targetRepo.find({
      where: { salesperson_id: salespersonId },
      relations: ['warehouse'],
      order: { period_end: 'DESC' },
    });

    // Recalculate achieved for each target
    for (const target of targets) {
      target.achieved_amount = await this.calculateAchieved(target);
    }
    await this.targetRepo.save(targets);

    return targets;
  }

  private async calculateAchieved(target: SalesTarget): Promise<number> {
    const result = await this.saleRepo
      .createQueryBuilder('sale')
      .select('COALESCE(SUM(sale.total_amount), 0)', 'total')
      .where('sale.salesperson_id = :salespersonId', {
        salespersonId: target.salesperson_id,
      })
      .andWhere('sale.warehouse_id = :warehouseId', {
        warehouseId: target.warehouse_id,
      })
      .andWhere('sale.status = :status', { status: SaleStatus.APPROVED })
      .andWhere('sale.created_at >= :start', { start: target.period_start })
      .andWhere('sale.created_at <= :end', { end: target.period_end })
      .getRawOne();

    return parseFloat(result?.total || '0');
  }
}
