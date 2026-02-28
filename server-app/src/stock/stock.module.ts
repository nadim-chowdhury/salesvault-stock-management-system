import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Stock } from '../entities/stock.entity';
import { StockAssignment } from '../entities/stock-assignment.entity';
import { Product } from '../entities/product.entity';
import { Warehouse } from '../entities/warehouse.entity';
import { User } from '../entities/user.entity';
import { StockService } from './stock.service';
import { StockController } from './stock.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Stock,
      StockAssignment,
      Product,
      Warehouse,
      User,
    ]),
  ],
  controllers: [StockController],
  providers: [StockService],
  exports: [StockService],
})
export class StockModule {}
