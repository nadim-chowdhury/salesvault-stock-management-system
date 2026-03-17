import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockAdjustmentController } from './stock-adjustment.controller';
import { StockAdjustmentService } from './stock-adjustment.service';
import { StockAdjustment } from '../entities/stock-adjustment.entity';
import { Stock } from '../entities/stock.entity';
import { ActivityLogModule } from '../activity-log/activity-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([StockAdjustment, Stock]),
    ActivityLogModule,
  ],
  controllers: [StockAdjustmentController],
  providers: [StockAdjustmentService]
})
export class StockAdjustmentModule {}
