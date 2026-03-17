import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Stock } from '../entities/stock.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Stock)
    private readonly stockRepo: Repository<Stock>,
  ) {}

  // Run every hour to check for low stock
  @Cron(CronExpression.EVERY_HOUR)
  async checkLowStockLevels() {
    this.logger.log('Starting scheduled low stock check...');

    // Find all stock rows where quantity <= low_stock_threshold
    const qb = this.stockRepo.createQueryBuilder('stock')
      .leftJoinAndSelect('stock.product', 'product')
      .leftJoinAndSelect('stock.warehouse', 'warehouse')
      .where('stock.quantity <= stock.low_stock_threshold');

    const lowStockItems = await qb.getMany();

    if (lowStockItems.length === 0) {
      this.logger.log('No low stock items found.');
      return;
    }

    // Usually, you would send an email or push notification here.
    // For MVP, we will log it internally as a notification trace.
    for (const item of lowStockItems) {
      this.logger.warn(
        `[LOW STOCK ALERT] Product: ${item.product.name} (SKU: ${item.product.sku}) in Warehouse: ${item.warehouse.name}. Current Quantity: ${item.quantity}, Threshold: ${item.low_stock_threshold}`
      );
    }
  }
}
