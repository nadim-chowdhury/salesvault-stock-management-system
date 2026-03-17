import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Check,
} from 'typeorm';
import { Product } from './product.entity';
import { Warehouse } from './warehouse.entity';
import { User } from './user.entity';

export enum AdjustmentReason {
  DAMAGED = 'DAMAGED',
  RETURN = 'RETURN',
  CORRECTION = 'CORRECTION',
  EXPIRY = 'EXPIRY',
}

@Entity('stock_adjustments')
export class StockAdjustment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  product_id: string;

  @Column({ type: 'uuid' })
  warehouse_id: string;

  @Column({ type: 'uuid' })
  adjusted_by: string;

  @Column({ type: 'int' })
  quantity_change: number; // Can be positive or negative

  @Column({
    type: 'enum',
    enum: AdjustmentReason,
  })
  reason: AdjustmentReason;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  created_at: Date;

  // Relations
  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => Warehouse)
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'adjusted_by' })
  user: User;
}
