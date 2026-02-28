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
import { SaleItem } from './sale-item.entity';
import { PaymentStatus } from '../common/enums/payment-status.enum';

@Entity('sales')
export class Sale {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  salesperson_id: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total_amount: number;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  payment_status: PaymentStatus;

  @Column({ length: 255, unique: true })
  @Index()
  idempotency_key: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  notes: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  customer_name: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  customer_phone: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'salesperson_id' })
  salesperson: User;

  @OneToMany(() => SaleItem, (item) => item.sale, {
    cascade: true,
    eager: true,
  })
  items: SaleItem[];

  @CreateDateColumn({ type: 'timestamptz' })
  @Index()
  created_at: Date;
}
