import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Sale } from '../entities/sale.entity';
import { SaleItem } from '../entities/sale-item.entity';
import { StockAssignment } from '../entities/stock-assignment.entity';
import { Stock } from '../entities/stock.entity';
import { Product } from '../entities/product.entity';
import { WarehouseUser } from '../entities/warehouse-user.entity';
import { User } from '../entities/user.entity';
import { CreateSaleDto } from './dto/create-sale.dto';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { ActionType } from '../common/enums/action-type.enum';
import { PaymentStatus } from '../common/enums/payment-status.enum';
import { SaleStatus } from '../common/enums/sale-status.enum';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(
    @InjectRepository(Sale)
    private readonly saleRepo: Repository<Sale>,
    @InjectRepository(StockAssignment)
    private readonly assignmentRepo: Repository<StockAssignment>,
    @InjectRepository(Stock)
    private readonly stockRepo: Repository<Stock>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(WarehouseUser)
    private readonly warehouseUserRepo: Repository<WarehouseUser>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly activityLogService: ActivityLogService,
  ) {}

  /**
   * Transaction-Safe Sale Creation:
   * BEGIN
   *   Check idempotency key
   *   Validate warehouse assignment for salesperson
   *   For each item:
   *     SELECT stock_assignment FOR UPDATE
   *     Validate quantity
   *     Deduct quantity_remaining
   *   Insert sale (status = PENDING_APPROVAL)
   *   Insert sale_items
   *   Insert activity log
   * COMMIT
   *
   * Failure → ROLLBACK
   */
  async createSale(
    dto: CreateSaleDto,
    salespersonId: string,
    userRole: string,
    ip?: string,
    deviceInfo?: string,
  ) {
    const isAdminOrManager =
      userRole === Role.ADMIN || userRole === Role.MANAGER;

    // Check idempotency key — prevent double submission
    const existingSale = await this.saleRepo.findOne({
      where: { idempotency_key: dto.idempotency_key },
      relations: ['items'],
    });
    if (existingSale) {
      this.logger.warn(
        `Duplicate sale attempt with idempotency_key: ${dto.idempotency_key}`,
      );
      return existingSale; // Return the existing sale instead of creating a duplicate
    }

    // For salesperson, validate warehouse assignment
    let warehouseId = dto.warehouse_id;
    if (!isAdminOrManager) {
      if (!warehouseId) {
        // Auto-detect if salesperson is assigned to exactly one warehouse
        const assignments = await this.warehouseUserRepo.find({
          where: { user_id: salespersonId },
        });
        if (assignments.length === 1) {
          warehouseId = assignments[0].warehouse_id;
        } else if (assignments.length > 1) {
          throw new BadRequestException(
            'You are assigned to multiple warehouses. Please specify warehouse_id.',
          );
        }
        // If 0 assignments, proceed without warehouse (backward compatible)
      } else {
        // Validate salesperson is assigned to this warehouse
        const isAssigned = await this.warehouseUserRepo.count({
          where: { user_id: salespersonId, warehouse_id: warehouseId },
        });
        if (!isAssigned) {
          throw new ForbiddenException(
            'You are not assigned to this warehouse',
          );
        }
      }
    }

    return this.dataSource.transaction(async (manager) => {
      let totalAmount = 0;
      const saleItems: Partial<SaleItem>[] = [];

      for (const item of dto.items) {
        // Verify product exists and is active
        const product = await manager.findOne(Product, {
          where: { id: item.product_id, is_active: true },
        });
        if (!product) {
          throw new NotFoundException(
            `Product ${item.product_id} not found or inactive`,
          );
        }

        let remainingNeeded = item.quantity;

        if (isAdminOrManager) {
          // ADMIN/MANAGER: deduct from warehouse stock if warehouseId is provided
          if (warehouseId) {
            const stock = await manager.findOne(Stock, {
              where: { product_id: item.product_id, warehouse_id: warehouseId },
              lock: { mode: 'pessimistic_write' },
            });

            if (stock) {
              const take = Math.min(remainingNeeded, stock.quantity);
              stock.quantity -= take;
              remainingNeeded -= take;
              await manager.save(stock);
            }
          } else {
            // No warehouse provided, just proceed without stock deduction
            remainingNeeded = 0;
          }
        } else {
          // SALESPERSON: deduct from assigned stock with pessimistic locking (FIFO)
          const assignments = await manager
            .createQueryBuilder(StockAssignment, 'sa')
            .setLock('pessimistic_write')
            .where('sa.salesperson_id = :salespersonId', { salespersonId })
            .andWhere('sa.product_id = :productId', {
              productId: item.product_id,
            })
            .andWhere('sa.warehouse_id = :warehouseId', {
              warehouseId,
            })
            .andWhere('sa.quantity_remaining > 0')
            .orderBy('sa.assigned_at', 'ASC') // Use oldest assignment first (FIFO)
            .getMany();

          for (const assignment of assignments) {
            const take = Math.min(remainingNeeded, assignment.quantity_remaining);
            assignment.quantity_remaining -= take;
            remainingNeeded -= take;
            await manager.save(assignment);
            if (remainingNeeded <= 0) break;
          }

          // If still needed, check warehouse stock
          if (remainingNeeded > 0 && warehouseId) {
            const stock = await manager.findOne(Stock, {
              where: { product_id: item.product_id, warehouse_id: warehouseId },
              lock: { mode: 'pessimistic_write' },
            });

            if (stock) {
              const take = Math.min(remainingNeeded, stock.quantity);
              stock.quantity -= take;
              remainingNeeded -= take;
              await manager.save(stock);
            }
          }
        }

        if (remainingNeeded > 0) {
          throw new BadRequestException(
            `Insufficient stock for product "${product.name}" (SKU: ${product.sku}). Requested: ${item.quantity}, Shortfall: ${remainingNeeded}`,
          );
        }

        const lineTotal = Number(product.price) * item.quantity;
        totalAmount += lineTotal;

        saleItems.push({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: Number(product.price),
          line_total: lineTotal,
        });
      }

      // Determine status — admin/manager sales are auto-approved
      const saleStatus = isAdminOrManager
        ? SaleStatus.APPROVED
        : SaleStatus.PENDING_APPROVAL;

      // Create the sale
      const saleData: Partial<Sale> = {
        salesperson_id: salespersonId,
        warehouse_id: warehouseId || undefined,
        store_id: dto.store_id || undefined,
        total_amount: totalAmount,
        payment_status: PaymentStatus.PENDING,
        status: saleStatus,
        idempotency_key: dto.idempotency_key,
        notes: dto.notes,
        customer_name: dto.customer_name,
        customer_phone: dto.customer_phone,
        approved_by: isAdminOrManager ? salespersonId : undefined,
        approved_at: isAdminOrManager ? new Date() : undefined,
        items: saleItems.map((item) => manager.create(SaleItem, item)),
      };
      const sale = manager.create(Sale, saleData);

      const saved = await manager.save(sale);

      // Log the sale
      await this.activityLogService.log({
        user_id: salespersonId,
        action_type: ActionType.SALE_CREATE,
        entity_type: 'Sale',
        entity_id: saved.id,
        new_data: {
          total_amount: totalAmount,
          items_count: saleItems.length,
          idempotency_key: dto.idempotency_key,
          customer_name: dto.customer_name,
          warehouse_id: warehouseId,
          store_id: dto.store_id,
          status: saleStatus,
        },
        ip_address: ip,
        device_info: deviceInfo,
      });

      this.logger.log(
        `Sale created: ${saved.id} by ${salespersonId}, total: ${totalAmount}, status: ${saleStatus}`,
      );

      return saved;
    });
  }

  async approveSale(saleId: string, managerId: string) {
    const sale = await this.saleRepo.findOne({
      where: { id: saleId },
      relations: ['items'],
    });

    if (!sale) {
      throw new NotFoundException('Sale not found');
    }

    if (sale.status !== SaleStatus.PENDING_APPROVAL) {
      throw new BadRequestException(
        `Sale cannot be approved. Current status: ${sale.status}`,
      );
    }

    sale.status = SaleStatus.APPROVED;
    sale.approved_by = managerId;
    sale.approved_at = new Date();
    await this.saleRepo.save(sale);

    await this.activityLogService.log({
      user_id: managerId,
      action_type: ActionType.SALE_APPROVE,
      entity_type: 'Sale',
      entity_id: saleId,
      new_data: {
        status: SaleStatus.APPROVED,
        approved_by: managerId,
        total_amount: sale.total_amount,
      },
    });

    return sale;
  }

  async rejectSale(saleId: string, managerId: string, reason?: string) {
    return this.dataSource.transaction(async (manager) => {
      const sale = await manager.findOne(Sale, {
        where: { id: saleId },
      });

      if (!sale) {
        throw new NotFoundException('Sale not found');
      }

      if (sale.status !== SaleStatus.PENDING_APPROVAL) {
        throw new BadRequestException(
          `Sale cannot be rejected. Current status: ${sale.status}`,
        );
      }

      // Load items separately
      sale.items = await manager.find(SaleItem, {
        where: { sale_id: sale.id },
      });

    // Restore stock to salesperson assignments or warehouse
    for (const item of sale.items) {
      await this.restoreStock(
        manager,
        sale.salesperson_id,
        item.product_id,
        sale.warehouse_id,
        item.quantity,
      );
    }

    sale.status = SaleStatus.REJECTED;
      sale.approved_by = managerId;
      sale.approved_at = new Date();
      if (reason) {
        sale.notes = sale.notes
          ? `${sale.notes}\n[REJECTED]: ${reason}`
          : `[REJECTED]: ${reason}`;
      }
      await manager.save(sale);

      await this.activityLogService.log({
        user_id: managerId,
        action_type: ActionType.SALE_REJECT,
        entity_type: 'Sale',
        entity_id: saleId,
        new_data: {
          status: SaleStatus.REJECTED,
          rejected_by: managerId,
          reason,
        },
      });

      return { message: 'Sale rejected and stock restored' };
    });
  }

  async assignSale(saleId: string, salespersonId: string, managerId: string) {
    const sale = await this.saleRepo.findOne({ where: { id: saleId } });
    if (!sale) {
      throw new NotFoundException('Sale not found');
    }

    // Validate salesperson exists
    const salesperson = await this.userRepo.findOne({
      where: {
        id: salespersonId,
        role: Role.SALESPERSON,
        is_active: true,
      },
    });
    if (!salesperson) {
      throw new NotFoundException('Salesperson not found or inactive');
    }

    // If sale has a warehouse, validate salesperson is assigned to it
    if (sale.warehouse_id) {
      const isAssigned = await this.warehouseUserRepo.count({
        where: {
          user_id: salespersonId,
          warehouse_id: sale.warehouse_id,
        },
      });
      if (!isAssigned) {
        throw new BadRequestException(
          'Salesperson is not assigned to the sale warehouse',
        );
      }
    }

    const oldAssignee = sale.assigned_to;
    sale.assigned_to = salespersonId;
    await this.saleRepo.save(sale);

    await this.activityLogService.log({
      user_id: managerId,
      action_type: ActionType.SALE_ASSIGN,
      entity_type: 'Sale',
      entity_id: saleId,
      old_data: { assigned_to: oldAssignee },
      new_data: {
        assigned_to: salespersonId,
        salesperson_name: salesperson.name,
      },
    });

    return sale;
  }

  async cancelSale(saleId: string, adminId: string) {
    return this.dataSource.transaction(async (manager) => {
      // Lock the sale row first
      const sale = await manager
        .createQueryBuilder(Sale, 'sale')
        .setLock('pessimistic_write')
        .where('sale.id = :saleId', { saleId })
        .getOne();

      // Then load items separately
      if (sale) {
        sale.items = await manager.find(SaleItem, {
          where: { sale_id: sale.id },
        });
      }

      if (!sale) {
        throw new NotFoundException('Sale not found');
      }

      if (sale.payment_status === PaymentStatus.CANCELLED) {
        throw new BadRequestException('Sale is already cancelled');
      }

      // Restore stock
      for (const item of sale.items) {
        await this.restoreStock(
          manager,
          sale.salesperson_id,
          item.product_id,
          sale.warehouse_id,
          item.quantity,
        );
      }

      // Update sale status
      sale.payment_status = PaymentStatus.CANCELLED;
      await manager.save(sale);

      await this.activityLogService.log({
        user_id: adminId,
        action_type: ActionType.SALE_CANCEL,
        entity_type: 'Sale',
        entity_id: saleId,
        old_data: { payment_status: PaymentStatus.PENDING },
        new_data: {
          payment_status: PaymentStatus.CANCELLED,
          cancelled_by: adminId,
        },
      });

      return { message: 'Sale cancelled and stock restored' };
    });
  }

  async remove(saleId: string, adminId: string) {
    return this.dataSource.transaction(async (manager) => {
      // Lock the sale row first
      const sale = await manager
        .createQueryBuilder(Sale, 'sale')
        .setLock('pessimistic_write')
        .where('sale.id = :saleId', { saleId })
        .getOne();

      if (!sale) {
        throw new NotFoundException('Sale not found');
      }

      // Load items
      sale.items = await manager.find(SaleItem, {
        where: { sale_id: sale.id },
      });

      // If the sale wasn't already cancelled/rejected, we need to restore stock
      if (
        sale.payment_status !== PaymentStatus.CANCELLED &&
        sale.status !== SaleStatus.REJECTED
      ) {
        // Restore stock to assignments or warehouse
        for (const item of sale.items) {
          await this.restoreStock(
            manager,
            sale.salesperson_id,
            item.product_id,
            sale.warehouse_id,
            item.quantity,
          );
        }
      }

      // Delete the sale (items cascade automatically due to DB constraints)
      await manager.remove(Sale, sale);

      await this.activityLogService.log({
        user_id: adminId,
        action_type: ActionType.SALE_DELETE as ActionType,
        entity_type: 'Sale',
        entity_id: saleId,
        new_data: {
          deleted_by: adminId,
          sale_id: saleId,
          total_amount: sale.total_amount,
        },
      });

      return { message: 'Sale permanently deleted' };
    });
  }

  async findAll(options: {
    page?: number;
    limit?: number;
    salesperson_id?: string;
    payment_status?: PaymentStatus;
    status?: SaleStatus;
    warehouse_id?: string;
    store_id?: string;
    from?: Date;
    to?: Date;
  }) {
    const page = options.page || 1;
    const limit = options.limit || 20;

    const qb = this.saleRepo
      .createQueryBuilder('sale')
      .leftJoinAndSelect('sale.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('sale.salesperson', 'salesperson')
      .leftJoinAndSelect('sale.warehouse', 'warehouse')
      .leftJoinAndSelect('sale.store', 'store')
      .orderBy('sale.created_at', 'DESC');

    if (options.salesperson_id) {
      qb.andWhere('sale.salesperson_id = :salesperson_id', {
        salesperson_id: options.salesperson_id,
      });
    }
    if (options.payment_status) {
      qb.andWhere('sale.payment_status = :payment_status', {
        payment_status: options.payment_status,
      });
    }
    if (options.status) {
      qb.andWhere('sale.status = :status', {
        status: options.status,
      });
    }
    if (options.warehouse_id) {
      qb.andWhere('sale.warehouse_id = :warehouse_id', {
        warehouse_id: options.warehouse_id,
      });
    }
    if (options.store_id) {
      qb.andWhere('sale.store_id = :store_id', {
        store_id: options.store_id,
      });
    }
    if (options.from) {
      qb.andWhere('sale.created_at >= :from', { from: options.from });
    }
    if (options.to) {
      qb.andWhere('sale.created_at <= :to', { to: options.to });
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

  async findOne(id: string) {
    const sale = await this.saleRepo.findOne({
      where: { id },
      relations: [
        'items',
        'items.product',
        'salesperson',
        'warehouse',
        'store',
        'approvedByUser',
        'assignedToUser',
      ],
    });
    if (!sale) throw new NotFoundException('Sale not found');
    return sale;
  }

  async getMySales(
    salespersonId: string,
    options: { page?: number; limit?: number },
  ) {
    return this.findAll({
      ...options,
      salesperson_id: salespersonId,
    });
  }

  async getDailyReport(date: Date, salespersonId?: string) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const qb = this.dataSource
      .getRepository(SaleItem)
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.product', 'product')
      .leftJoin('item.sale', 'sale')
      .select('product.id', 'product_id')
      .addSelect('product.name', 'product_name')
      .addSelect('product.sku', 'sku')
      .addSelect('SUM(item.quantity)', 'total_quantity')
      .addSelect('SUM(item.line_total)', 'total_amount')
      .where('sale.created_at BETWEEN :start AND :end', {
        start: startOfDay,
        end: endOfDay,
      })
      .andWhere('sale.status = :status', { status: SaleStatus.APPROVED })
      .groupBy('product.id')
      .addGroupBy('product.name')
      .addGroupBy('product.sku');

    if (salespersonId) {
      qb.andWhere('sale.salesperson_id = :salespersonId', { salespersonId });
    }

    const results = await qb.getRawMany();

    return results.map((r) => ({
      product_id: r.product_id,
      product_name: r.product_name,
      sku: r.sku,
      total_quantity: parseInt(r.total_quantity, 10),
      total_amount: parseFloat(r.total_amount),
    }));
  }

  private async restoreStock(
    manager: any,
    salespersonId: string,
    productId: string,
    warehouseId: string | null,
    quantity: number,
  ) {
    if (!warehouseId) return;

    // Try to find the most recent assignment for this salesperson/product/warehouse
    const assignment = await manager
      .createQueryBuilder(StockAssignment, 'sa')
      .setLock('pessimistic_write')
      .where('sa.salesperson_id = :salespersonId', { salespersonId })
      .andWhere('sa.product_id = :productId', { productId })
      .andWhere('sa.warehouse_id = :warehouseId', { warehouseId })
      .orderBy('sa.assigned_at', 'DESC') // Use newest assignment
      .getOne();

    if (assignment) {
      assignment.quantity_remaining += quantity;
      await manager.save(assignment);
    } else {
      // Restore to warehouse stock
      const stock = await manager.findOne(Stock, {
        where: { product_id: productId, warehouse_id: warehouseId },
        lock: { mode: 'pessimistic_write' },
      });

      if (stock) {
        stock.quantity += quantity;
        await manager.save(stock);
      } else {
        // Create stock entry if it doesn't exist? (unlikely but safe)
        const newStock = manager.create(Stock, {
          product_id: productId,
          warehouse_id: warehouseId,
          quantity: quantity,
        });
        await manager.save(newStock);
      }
    }
  }
}
