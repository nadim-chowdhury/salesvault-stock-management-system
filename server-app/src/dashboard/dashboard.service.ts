import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import { Sale } from '../entities/sale.entity';
import { SaleItem } from '../entities/sale-item.entity';
import { Stock } from '../entities/stock.entity';
import { Product } from '../entities/product.entity';
import { StockAssignment } from '../entities/stock-assignment.entity';
import { ActivityLog } from '../entities/activity-log.entity';
import { PaymentStatus } from '../common/enums/payment-status.enum';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Sale)
    private readonly saleRepo: Repository<Sale>,
    @InjectRepository(Stock)
    private readonly stockRepo: Repository<Stock>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(StockAssignment)
    private readonly assignmentRepo: Repository<StockAssignment>,
    @InjectRepository(ActivityLog)
    private readonly activityLogRepo: Repository<ActivityLog>,
  ) {}

  async getAdminDashboard() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Run all queries in parallel for performance
    const [
      salesToday,
      totalSalesToday,
      monthlySales,
      totalMonthlySales,
      lowStockAlerts,
      topSalespersons,
      recentActivity,
    ] = await Promise.all([
      // Total sales today (count)
      this.saleRepo.count({
        where: {
          created_at: Between(today, endOfDay),
          payment_status: PaymentStatus.PENDING,
        },
      }),
      // Total sales amount today
      this.saleRepo
        .createQueryBuilder('sale')
        .select('COALESCE(SUM(sale.total_amount), 0)', 'total')
        .where('sale.created_at BETWEEN :start AND :end', {
          start: today,
          end: endOfDay,
        })
        .andWhere('sale.payment_status != :cancelled', {
          cancelled: PaymentStatus.CANCELLED,
        })
        .getRawOne(),
      // Monthly sales count
      this.saleRepo.count({
        where: {
          created_at: MoreThanOrEqual(monthStart),
          payment_status: PaymentStatus.PENDING,
        },
      }),
      // Monthly sales amount
      this.saleRepo
        .createQueryBuilder('sale')
        .select('COALESCE(SUM(sale.total_amount), 0)', 'total')
        .where('sale.created_at >= :monthStart', { monthStart })
        .andWhere('sale.payment_status != :cancelled', {
          cancelled: PaymentStatus.CANCELLED,
        })
        .getRawOne(),
      // Low stock alerts (quantity <= 10)
      this.stockRepo
        .createQueryBuilder('stock')
        .leftJoinAndSelect('stock.product', 'product')
        .leftJoinAndSelect('stock.warehouse', 'warehouse')
        .where('stock.quantity <= :threshold', { threshold: 10 })
        .orderBy('stock.quantity', 'ASC')
        .take(20)
        .getMany(),
      // Top salespersons (by total_amount this month)
      this.saleRepo
        .createQueryBuilder('sale')
        .leftJoin('sale.salesperson', 'user')
        .select('user.id', 'id')
        .addSelect('user.name', 'name')
        .addSelect('user.email', 'email')
        .addSelect('COUNT(sale.id)', 'sales_count')
        .addSelect('COALESCE(SUM(sale.total_amount), 0)', 'total_sales')
        .where('sale.created_at >= :monthStart', { monthStart })
        .andWhere('sale.payment_status != :cancelled', {
          cancelled: PaymentStatus.CANCELLED,
        })
        .groupBy('user.id')
        .addGroupBy('user.name')
        .addGroupBy('user.email')
        .orderBy('"total_sales"', 'DESC')
        .take(10)
        .getRawMany(),
      // Recent system activity
      this.activityLogRepo.find({
        relations: ['user'],
        order: { created_at: 'DESC' },
        take: 20,
      }),
    ]);

    return {
      sales_today: {
        count: salesToday,
        total_amount: Number(totalSalesToday?.total || 0),
      },
      monthly_sales: {
        count: monthlySales,
        total_amount: Number(totalMonthlySales?.total || 0),
      },
      low_stock_alerts: lowStockAlerts,
      top_salespersons: topSalespersons,
      recent_activity: recentActivity,
    };
  }

  async getSalespersonDashboard(salespersonId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const [mySalesToday, myTotalToday, myAssignedStock, myRecentActivity] =
      await Promise.all([
        // My sales today
        this.saleRepo.count({
          where: {
            salesperson_id: salespersonId,
            created_at: Between(today, endOfDay),
            payment_status: PaymentStatus.PENDING,
          },
        }),
        // My total today
        this.saleRepo
          .createQueryBuilder('sale')
          .select('COALESCE(SUM(sale.total_amount), 0)', 'total')
          .where('sale.salesperson_id = :salespersonId', { salespersonId })
          .andWhere('sale.created_at BETWEEN :start AND :end', {
            start: today,
            end: endOfDay,
          })
          .andWhere('sale.payment_status != :cancelled', {
            cancelled: PaymentStatus.CANCELLED,
          })
          .getRawOne(),
        // My assigned stock with remaining
        this.assignmentRepo.find({
          where: { salesperson_id: salespersonId },
          relations: ['product', 'warehouse'],
          order: { assigned_at: 'DESC' },
        }),
        // My recent activities
        this.activityLogRepo.find({
          where: { user_id: salespersonId },
          order: { created_at: 'DESC' },
          take: 15,
        }),
      ]);

    // Calculate totals
    const totalAssigned = myAssignedStock.reduce(
      (sum, a) => sum + a.quantity_assigned,
      0,
    );
    const totalRemaining = myAssignedStock.reduce(
      (sum, a) => sum + a.quantity_remaining,
      0,
    );

    return {
      my_sales_today: {
        count: mySalesToday,
        total_amount: Number(myTotalToday?.total || 0),
      },
      my_stock: {
        assignments: myAssignedStock,
        total_assigned: totalAssigned,
        total_remaining: totalRemaining,
      },
      my_recent_activity: myRecentActivity,
    };
  }

  async getInventoryValuation() {
    // Valuation = sum(stock.quantity * product.price) across all warehouses
    const valuationQuery = await this.stockRepo
      .createQueryBuilder('stock')
      .leftJoin('stock.product', 'product')
      .select('COALESCE(SUM(stock.quantity * product.cost_price), 0)', 'total_cost_value')
      .addSelect('COALESCE(SUM(stock.quantity * product.price), 0)', 'total_retail_value')
      .getRawOne();

    return {
      cost_value: Number(valuationQuery?.total_cost_value || 0),
      retail_value: Number(valuationQuery?.total_retail_value || 0),
      potential_profit: Number(valuationQuery?.total_retail_value || 0) - Number(valuationQuery?.total_cost_value || 0),
    };
  }

  async getFastestMovingItems(days: number = 30) {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    // Get the most sold items across all approved sales in the last X days
    const fastestMoving = await this.saleRepo.manager
      .createQueryBuilder(SaleItem, 'item')
      .leftJoin('item.sale', 'sale')
      .leftJoinAndSelect('item.product', 'product')
      .select('product.id', 'product_id')
      .addSelect('product.name', 'product_name')
      .addSelect('product.sku', 'sku')
      .addSelect('SUM(item.quantity)', 'total_sold_quantity')
      .where('sale.created_at >= :fromDate', { fromDate })
      .andWhere('sale.payment_status != :cancelled', { cancelled: PaymentStatus.CANCELLED })
      .groupBy('product.id')
      .addGroupBy('product.name')
      .addGroupBy('product.sku')
      .orderBy('"total_sold_quantity"', 'DESC')
      .take(10)
      .getRawMany();

    return fastestMoving.map((item) => ({
      product_id: item.product_id,
      product_name: item.product_name,
      sku: item.sku,
      total_sold_quantity: parseInt(item.total_sold_quantity, 10),
    }));
  }
}
