import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { ActionType } from '../common/enums/action-type.enum';

@Entity('activity_logs')
export class ActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  user_id: string | null;

  @Column({ type: 'enum', enum: ActionType })
  @Index()
  action_type: ActionType;

  @Column({ type: 'varchar', length: 100 })
  entity_type: string;

  @Column({ type: 'uuid', nullable: true })
  entity_id: string | null;

  @Column({ type: 'jsonb', nullable: true })
  old_data: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  new_data: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip_address: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  device_info: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  previous_hash: string | null;

  @Column({ type: 'varchar', length: 64 })
  current_hash: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ type: 'timestamptz' })
  @Index()
  created_at: Date;
}
