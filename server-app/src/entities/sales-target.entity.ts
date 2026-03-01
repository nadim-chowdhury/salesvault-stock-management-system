import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Warehouse } from './warehouse.entity';

@Entity('sales_targets')
export class SalesTarget {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  salesperson_id: string;

  @Column({ type: 'uuid' })
  @Index()
  warehouse_id: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  target_amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  achieved_amount: number;

  @Column({ type: 'date' })
  period_start: Date;

  @Column({ type: 'date' })
  period_end: Date;

  @Column({ type: 'uuid' })
  assigned_by: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'salesperson_id' })
  salesperson: User;

  @ManyToOne(() => Warehouse, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_by' })
  assignedByUser: User;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
