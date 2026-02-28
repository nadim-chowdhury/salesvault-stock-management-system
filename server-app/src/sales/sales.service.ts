import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Sale } from '../entities/sale.entity';
import { SaleItem } from '../entities/sale-item.entity';
import { StockAssignment } from '../entities/stock-assignment.entity';
import { Product } from '../entities/product.entity';
import { CreateSaleDto } from './dto/create-sale.dto';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { ActionType } from '../common/enums/action-type.enum';
import { PaymentStatus } from '../common/enums/payment-status.enum';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(
    @InjectRepository(Sale)
    private readonly saleRepo: Repository<Sale>,
    @InjectRepository(StockAssignment)
    private readonly assignmentRepo: Repository<StockAssignment>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly dataSource: DataSource,
    private readonly activityLogService: ActivityLogService,
  ) {}

  /**
   * Transaction-Safe Sale Creation:
   * BEGIN
   *   Check idempotency key
   *   For each item:
   *     SELECT stock_assignment FOR UPDATE
   *     Validate quantity
   *     Deduct quantity_remaining
   *   Insert sale
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

        if (isAdminOrManager) {
          // ADMIN/MANAGER: sell directly from catalog, no stock assignment needed
          const lineTotal = Number(product.price) * item.quantity;
          totalAmount += lineTotal;

          saleItems.push({
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: Number(product.price),
            line_total: lineTotal,
          });
        } else {
          // SALESPERSON: deduct from assigned stock with pessimistic locking
          const assignment = await manager
            .createQueryBuilder(StockAssignment, 'sa')
            .setLock('pessimistic_write')
            .where('sa.salesperson_id = :salespersonId', { salespersonId })
            .andWhere('sa.product_id = :productId', {
              productId: item.product_id,
            })
            .andWhere('sa.quantity_remaining >= :quantity', {
              quantity: item.quantity,
            })
            .orderBy('sa.assigned_at', 'ASC') // Use oldest assignment first (FIFO)
            .getOne();

          if (!assignment) {
            throw new BadRequestException(
              `Insufficient stock for product "${product.name}" (SKU: ${product.sku}). Requested: ${item.quantity}`,
            );
          }

          // Deduct from assignment
          assignment.quantity_remaining -= item.quantity;
          await manager.save(assignment);

          const lineTotal = Number(product.price) * item.quantity;
          totalAmount += lineTotal;

          saleItems.push({
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: Number(product.price),
            line_total: lineTotal,
          });
        }
      }

      // Create the sale
      const sale = manager.create(Sale, {
        salesperson_id: salespersonId,
        total_amount: totalAmount,
        payment_status: PaymentStatus.PENDING,
        idempotency_key: dto.idempotency_key,
        notes: dto.notes,
        customer_name: dto.customer_name,
        customer_phone: dto.customer_phone,
        items: saleItems.map((item) => manager.create(SaleItem, item)),
      });

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
        },
        ip_address: ip,
        device_info: deviceInfo,
      });

      this.logger.log(
        `Sale created: ${saved.id} by ${salespersonId}, total: ${totalAmount}`,
      );

      return saved;
    });
  }

  async cancelSale(saleId: string, adminId: string) {
    return this.dataSource.transaction(async (manager) => {
      // Lock the sale row first (no joins — FOR UPDATE can't be used with LEFT JOIN in PostgreSQL)
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

      // Restore stock to assignments
      for (const item of sale.items) {
        // Find the assignment and restore quantity
        const assignment = await manager
          .createQueryBuilder(StockAssignment, 'sa')
          .setLock('pessimistic_write')
          .where('sa.salesperson_id = :salespersonId', {
            salespersonId: sale.salesperson_id,
          })
          .andWhere('sa.product_id = :productId', {
            productId: item.product_id,
          })
          .orderBy('sa.assigned_at', 'ASC')
          .getOne();

        if (assignment) {
          assignment.quantity_remaining += item.quantity;
          await manager.save(assignment);
        }
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

  async findAll(options: {
    page?: number;
    limit?: number;
    salesperson_id?: string;
    payment_status?: PaymentStatus;
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
      relations: ['items', 'items.product', 'salesperson'],
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
}
