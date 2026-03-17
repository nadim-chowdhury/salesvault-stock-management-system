import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { StockAdjustment } from '../entities/stock-adjustment.entity';
import { Stock } from '../entities/stock.entity';
import { CreateStockAdjustmentDto } from './dto/create-stock-adjustment.dto';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { ActionType } from '../common/enums/action-type.enum';

@Injectable()
export class StockAdjustmentService {
  private readonly logger = new Logger(StockAdjustmentService.name);

  constructor(
    @InjectRepository(StockAdjustment)
    private readonly adjustmentRepo: Repository<StockAdjustment>,
    @InjectRepository(Stock)
    private readonly stockRepo: Repository<Stock>,
    private readonly dataSource: DataSource,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async adjustStock(
    dto: CreateStockAdjustmentDto,
    userId: string,
    ip?: string,
    deviceInfo?: string,
  ) {
    return this.dataSource.transaction(async (manager) => {
      // 1. Lock stock row
      const stock = await manager
        .createQueryBuilder(Stock, 's')
        .setLock('pessimistic_write')
        .where('s.product_id = :productId', { productId: dto.product_id })
        .andWhere('s.warehouse_id = :warehouseId', { warehouseId: dto.warehouse_id })
        .getOne();

      if (!stock) {
        throw new NotFoundException('Stock record not found for this product and warehouse');
      }

      // 2. Validate adjustment (prevent negative total stock)
      if (stock.quantity + dto.quantity_change < 0) {
        throw new BadRequestException('Adjustment would result in negative stock');
      }

      const oldQuantity = stock.quantity;
      stock.quantity += dto.quantity_change;

      // 3. Save stock change
      await manager.save(stock);

      // 4. Record adjustment reason
      const adjustment = manager.create(StockAdjustment, {
        product_id: dto.product_id,
        warehouse_id: dto.warehouse_id,
        adjusted_by: userId,
        quantity_change: dto.quantity_change,
        reason: dto.reason,
        notes: dto.notes,
      });
      const savedAdjustment = await manager.save(adjustment);

      // 5. Activity log
      await this.activityLogService.log({
        user_id: userId,
        action_type: ActionType.STOCK_ADD, // Reusing existing enum or consider a new one like STOCK_ADJUST
        entity_type: 'StockAdjustment',
        entity_id: savedAdjustment.id,
        old_data: { quantity: oldQuantity },
        new_data: {
          quantity: stock.quantity,
          change: dto.quantity_change,
          reason: dto.reason,
        },
        ip_address: ip,
        device_info: deviceInfo,
      });

      this.logger.log(`Stock adjusted for product ${dto.product_id} by user ${userId}. Reason: ${dto.reason}`);
      return savedAdjustment;
    });
  }

  async findAll(options: { page?: number; limit?: number; warehouse_id?: string; product_id?: string }) {
    const page = options.page || 1;
    const limit = options.limit || 20;

    const qb = this.adjustmentRepo.createQueryBuilder('adj')
      .leftJoinAndSelect('adj.product', 'product')
      .leftJoinAndSelect('adj.warehouse', 'warehouse')
      .leftJoinAndSelect('adj.user', 'user')
      .orderBy('adj.created_at', 'DESC');

    if (options.warehouse_id) {
      qb.andWhere('adj.warehouse_id = :warehouseId', { warehouseId: options.warehouse_id });
    }
    if (options.product_id) {
      qb.andWhere('adj.product_id = :productId', { productId: options.product_id });
    }

    const total = await qb.getCount();
    const data = await qb.skip((page - 1) * limit).take(limit).getMany();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
