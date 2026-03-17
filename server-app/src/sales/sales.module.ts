import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sale } from '../entities/sale.entity';
import { SaleItem } from '../entities/sale-item.entity';
import { StockAssignment } from '../entities/stock-assignment.entity';
import { Stock } from '../entities/stock.entity';
import { Product } from '../entities/product.entity';
import { WarehouseUser } from '../entities/warehouse-user.entity';
import { User } from '../entities/user.entity';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Sale,
      SaleItem,
      StockAssignment,
      Stock,
      Product,
      WarehouseUser,
      User,
    ]),
  ],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
