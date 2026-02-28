import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Role } from '../common/enums/role.enum';
import { Exclude } from 'class-transformer';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 255, unique: true })
  @Index()
  email: string;

  @Column({ length: 255 })
  @Exclude()
  password_hash: string;

  @Column({ type: 'enum', enum: Role, default: Role.SALESPERSON })
  role: Role;

  @Column({ default: true })
  is_active: boolean;

  @Column({ default: 0 })
  failed_attempts: number;

  @Column({ type: 'timestamptz', nullable: true })
  locked_until: Date | null;

  @Column({ default: 0 })
  token_version: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
