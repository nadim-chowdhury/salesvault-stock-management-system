import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesTargetsService } from './sales-targets.service';
import { SalesTargetsController } from './sales-targets.controller';
import { SalesTarget } from '../entities/sales-target.entity';
import { Sale } from '../entities/sale.entity';
import { User } from '../entities/user.entity';
import { WarehouseUser } from '../entities/warehouse-user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SalesTarget, Sale, User, WarehouseUser])],
  controllers: [SalesTargetsController],
  providers: [SalesTargetsService],
  exports: [SalesTargetsService],
})
export class SalesTargetsModule {}
