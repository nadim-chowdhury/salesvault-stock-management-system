import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sale } from '../entities/sale.entity';
import { Stock } from '../entities/stock.entity';
import { Product } from '../entities/product.entity';
import { StockAssignment } from '../entities/stock-assignment.entity';
import { ActivityLog } from '../entities/activity-log.entity';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sale, Stock, Product, StockAssignment, ActivityLog]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
