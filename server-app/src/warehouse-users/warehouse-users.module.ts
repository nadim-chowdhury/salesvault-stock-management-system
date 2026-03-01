import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WarehouseUsersService } from './warehouse-users.service';
import { WarehouseUsersController } from './warehouse-users.controller';
import { WarehouseUser } from '../entities/warehouse-user.entity';
import { User } from '../entities/user.entity';
import { Warehouse } from '../entities/warehouse.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WarehouseUser, User, Warehouse])],
  controllers: [WarehouseUsersController],
  providers: [WarehouseUsersService],
  exports: [WarehouseUsersService],
})
export class WarehouseUsersModule {}
