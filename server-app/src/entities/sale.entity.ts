import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Warehouse } from './warehouse.entity';
import { Store } from './store.entity';
import { SaleItem } from './sale-item.entity';
import { PaymentStatus } from '../common/enums/payment-status.enum';
import { SaleStatus } from '../common/enums/sale-status.enum';

@Entity('sales')
export class Sale {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  salesperson_id: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  warehouse_id: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  store_id: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total_amount: number;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  payment_status: PaymentStatus;

  @Column({
    type: 'enum',
    enum: SaleStatus,
    default: SaleStatus.PENDING_APPROVAL,
  })
  @Index()
  status: SaleStatus;

  @Column({ length: 255, unique: true })
  @Index()
  idempotency_key: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  notes: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  customer_name: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  customer_phone: string;

  @Column({ type: 'uuid', nullable: true })
  approved_by: string;

  @Column({ type: 'timestamptz', nullable: true })
  approved_at: Date;

  @Column({ type: 'uuid', nullable: true })
  assigned_to: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'salesperson_id' })
  salesperson: User;

  @ManyToOne(() => Warehouse, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  @ManyToOne(() => Store, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'approved_by' })
  approvedByUser: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assigned_to' })
  assignedToUser: User;

  @OneToMany(() => SaleItem, (item) => item.sale, {
    cascade: true,
    eager: true,
  })
  items: SaleItem[];

  @CreateDateColumn({ type: 'timestamptz' })
  @Index()
  created_at: Date;
}
