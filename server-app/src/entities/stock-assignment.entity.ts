import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
  Check,
} from 'typeorm';
import { User } from './user.entity';
import { Product } from './product.entity';
import { Warehouse } from './warehouse.entity';

@Entity('stock_assignments')
@Check('"quantity_remaining" >= 0')
export class StockAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  salesperson_id: string;

  @Column({ type: 'uuid' })
  @Index()
  product_id: string;

  @Column({ type: 'uuid' })
  warehouse_id: string;

  @Column({ type: 'int' })
  quantity_assigned: number;

  @Column({ type: 'int' })
  quantity_remaining: number;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'salesperson_id' })
  salesperson: User;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => Warehouse, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  @CreateDateColumn({ type: 'timestamptz' })
  assigned_at: Date;
}
