import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Stock } from '../entities/stock.entity';
import { StockAssignment } from '../entities/stock-assignment.entity';
import { Product } from '../entities/product.entity';
import { Warehouse } from '../entities/warehouse.entity';
import { User } from '../entities/user.entity';
import { AddStockDto } from './dto/add-stock.dto';
import { AssignStockDto } from './dto/assign-stock.dto';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { ActionType } from '../common/enums/action-type.enum';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class StockService {
  constructor(
    @InjectRepository(Stock)
    private readonly stockRepo: Repository<Stock>,
    @InjectRepository(StockAssignment)
    private readonly assignmentRepo: Repository<StockAssignment>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Warehouse)
    private readonly warehouseRepo: Repository<Warehouse>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async addStock(dto: AddStockDto, userId: string) {
    // Validate product and warehouse exist
    const product = await this.productRepo.findOne({
      where: { id: dto.product_id, is_active: true },
    });
    if (!product) throw new NotFoundException('Product not found or inactive');

    const warehouse = await this.warehouseRepo.findOne({
      where: { id: dto.warehouse_id, is_active: true },
    });
    if (!warehouse)
      throw new NotFoundException('Warehouse not found or inactive');

    // Use transaction with pessimistic locking
    return this.dataSource.transaction(async (manager) => {
      let stock = await manager.findOne(Stock, {
        where: { product_id: dto.product_id, warehouse_id: dto.warehouse_id },
        lock: { mode: 'pessimistic_write' },
      });

      if (stock) {
        const oldQty = stock.quantity;
        stock.quantity += dto.quantity;
        await manager.save(stock);

        await this.activityLogService.log({
          user_id: userId,
          action_type: ActionType.STOCK_ADD,
          entity_type: 'Stock',
          entity_id: stock.id,
          old_data: { quantity: oldQty },
          new_data: { quantity: stock.quantity, added: dto.quantity },
        });
      } else {
        stock = manager.create(Stock, {
          product_id: dto.product_id,
          warehouse_id: dto.warehouse_id,
          quantity: dto.quantity,
        });
        await manager.save(stock);

        await this.activityLogService.log({
          user_id: userId,
          action_type: ActionType.STOCK_ADD,
          entity_type: 'Stock',
          entity_id: stock.id,
          new_data: {
            product_id: dto.product_id,
            warehouse_id: dto.warehouse_id,
            quantity: dto.quantity,
          },
        });
      }

      return stock;
    });
  }

  async assignStock(dto: AssignStockDto, userId: string) {
    // Validate salesperson
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

    return this.dataSource.transaction(async (manager) => {
      // Lock the stock row
      const stock = await manager.findOne(Stock, {
        where: { product_id: dto.product_id, warehouse_id: dto.warehouse_id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!stock) {
        throw new NotFoundException(
          'No stock found for this product in this warehouse',
        );
      }

      if (stock.quantity < dto.quantity) {
        throw new BadRequestException(
          `Insufficient stock. Available: ${stock.quantity}, Requested: ${dto.quantity}`,
        );
      }

      // Deduct from warehouse stock
      stock.quantity -= dto.quantity;
      await manager.save(stock);

      // Create assignment
      const assignment = manager.create(StockAssignment, {
        salesperson_id: dto.salesperson_id,
        product_id: dto.product_id,
        warehouse_id: dto.warehouse_id,
        quantity_assigned: dto.quantity,
        quantity_remaining: dto.quantity,
      });
      await manager.save(assignment);

      await this.activityLogService.log({
        user_id: userId,
        action_type: ActionType.STOCK_ASSIGN,
        entity_type: 'StockAssignment',
        entity_id: assignment.id,
        new_data: {
          salesperson_id: dto.salesperson_id,
          product_id: dto.product_id,
          warehouse_id: dto.warehouse_id,
          quantity: dto.quantity,
          warehouse_remaining: stock.quantity,
        },
      });

      return assignment;
    });
  }

  async getWarehouseStock(options: {
    page?: number;
    limit?: number;
    warehouse_id?: string;
    product_id?: string;
    low_stock_threshold?: number;
  }) {
    const page = options.page || 1;
    const limit = options.limit || 20;

    const qb = this.stockRepo
      .createQueryBuilder('stock')
      .leftJoinAndSelect('stock.product', 'product')
      .leftJoinAndSelect('stock.warehouse', 'warehouse')
      .orderBy('stock.quantity', 'ASC');

    if (options.warehouse_id) {
      qb.andWhere('stock.warehouse_id = :warehouse_id', {
        warehouse_id: options.warehouse_id,
      });
    }
    if (options.product_id) {
      qb.andWhere('stock.product_id = :product_id', {
        product_id: options.product_id,
      });
    }
    if (options.low_stock_threshold) {
      qb.andWhere('stock.quantity <= :threshold', {
        threshold: options.low_stock_threshold,
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

  async getAssignments(options: {
    page?: number;
    limit?: number;
    salesperson_id?: string;
    product_id?: string;
  }) {
    const page = options.page || 1;
    const limit = options.limit || 20;

    const qb = this.assignmentRepo
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.salesperson', 'salesperson')
      .leftJoinAndSelect('assignment.product', 'product')
      .leftJoinAndSelect('assignment.warehouse', 'warehouse')
      .orderBy('assignment.assigned_at', 'DESC');

    if (options.salesperson_id) {
      qb.andWhere('assignment.salesperson_id = :salesperson_id', {
        salesperson_id: options.salesperson_id,
      });
    }
    if (options.product_id) {
      qb.andWhere('assignment.product_id = :product_id', {
        product_id: options.product_id,
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

  async getSalespersonStock(salespersonId: string) {
    return this.assignmentRepo.find({
      where: { salesperson_id: salespersonId },
      relations: ['product', 'warehouse'],
      order: { assigned_at: 'DESC' },
    });
  }
}
