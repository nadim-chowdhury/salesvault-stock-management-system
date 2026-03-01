import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WarehouseUser } from '../entities/warehouse-user.entity';
import { User } from '../entities/user.entity';
import { Warehouse } from '../entities/warehouse.entity';
import { AssignUserWarehouseDto } from './dto/assign-user-warehouse.dto';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { ActionType } from '../common/enums/action-type.enum';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class WarehouseUsersService {
  constructor(
    @InjectRepository(WarehouseUser)
    private readonly warehouseUserRepo: Repository<WarehouseUser>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Warehouse)
    private readonly warehouseRepo: Repository<Warehouse>,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async assignUser(dto: AssignUserWarehouseDto, assignedById: string) {
    // Validate warehouse exists and is active
    const warehouse = await this.warehouseRepo.findOne({
      where: { id: dto.warehouse_id, is_active: true },
    });
    if (!warehouse) {
      throw new NotFoundException('Warehouse not found or inactive');
    }

    // Validate user exists and is active
    const user = await this.userRepo.findOne({
      where: { id: dto.user_id, is_active: true },
    });
    if (!user) {
      throw new NotFoundException('User not found or inactive');
    }

    // Only salespersons and managers can be assigned to warehouses
    if (user.role === Role.ADMIN) {
      throw new BadRequestException(
        'Admin users cannot be assigned to warehouses',
      );
    }

    // Check for duplicate assignment
    const existing = await this.warehouseUserRepo.findOne({
      where: {
        warehouse_id: dto.warehouse_id,
        user_id: dto.user_id,
      },
    });
    if (existing) {
      throw new ConflictException('User is already assigned to this warehouse');
    }

    const assignment = this.warehouseUserRepo.create({
      warehouse_id: dto.warehouse_id,
      user_id: dto.user_id,
      assigned_by: assignedById,
    });

    const saved = await this.warehouseUserRepo.save(assignment);

    await this.activityLogService.log({
      user_id: assignedById,
      action_type: ActionType.WAREHOUSE_USER_ASSIGN,
      entity_type: 'WarehouseUser',
      entity_id: saved.id,
      new_data: {
        warehouse_id: dto.warehouse_id,
        warehouse_name: warehouse.name,
        user_id: dto.user_id,
        user_name: user.name,
      },
    });

    return saved;
  }

  async removeUser(warehouseId: string, userId: string, removedById: string) {
    const assignment = await this.warehouseUserRepo.findOne({
      where: { warehouse_id: warehouseId, user_id: userId },
      relations: ['user', 'warehouse'],
    });

    if (!assignment) {
      throw new NotFoundException('User is not assigned to this warehouse');
    }

    await this.warehouseUserRepo.remove(assignment);

    await this.activityLogService.log({
      user_id: removedById,
      action_type: ActionType.WAREHOUSE_USER_REMOVE,
      entity_type: 'WarehouseUser',
      entity_id: assignment.id,
      old_data: {
        warehouse_id: warehouseId,
        warehouse_name: assignment.warehouse?.name,
        user_id: userId,
        user_name: assignment.user?.name,
      },
    });

    return { message: 'User removed from warehouse successfully' };
  }

  async getWarehouseUsers(warehouseId: string) {
    return this.warehouseUserRepo.find({
      where: { warehouse_id: warehouseId },
      relations: ['user'],
      order: { assigned_at: 'DESC' },
    });
  }

  async getUserWarehouses(userId: string) {
    return this.warehouseUserRepo.find({
      where: { user_id: userId },
      relations: ['warehouse'],
      order: { assigned_at: 'DESC' },
    });
  }

  async getMyWarehouses(userId: string) {
    const assignments = await this.warehouseUserRepo.find({
      where: { user_id: userId },
      relations: ['warehouse'],
      order: { assigned_at: 'DESC' },
    });
    return assignments.map((a) => a.warehouse).filter((w) => w && w.is_active);
  }

  async isUserAssignedToWarehouse(
    userId: string,
    warehouseId: string,
  ): Promise<boolean> {
    const count = await this.warehouseUserRepo.count({
      where: { user_id: userId, warehouse_id: warehouseId },
    });
    return count > 0;
  }
}
