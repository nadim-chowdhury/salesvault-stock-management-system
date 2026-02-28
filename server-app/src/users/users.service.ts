import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { User } from '../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { ActionType } from '../common/enums/action-type.enum';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly configService: ConfigService,
    private readonly activityLogService: ActivityLogService,
    private readonly authService: AuthService,
  ) {}

  async create(dto: CreateUserDto, currentUserId?: string) {
    // Check duplicate email
    const existing = await this.userRepo.findOne({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const rounds = this.configService.get<number>('BCRYPT_ROUNDS', 12);
    const passwordHash = await bcrypt.hash(dto.password, rounds);

    const user = this.userRepo.create({
      name: dto.name.trim(),
      email: dto.email.toLowerCase().trim(),
      password_hash: passwordHash,
      role: dto.role,
    });

    const saved = await this.userRepo.save(user);

    await this.activityLogService.log({
      user_id: currentUserId,
      action_type: ActionType.USER_CREATE,
      entity_type: 'User',
      entity_id: saved.id,
      new_data: { name: saved.name, email: saved.email, role: saved.role },
    });

    const { password_hash, ...result } = saved;
    return result;
  }

  async findAll(options: {
    page?: number;
    limit?: number;
    role?: string;
    is_active?: boolean;
    search?: string;
  }) {
    const page = options.page || 1;
    const limit = options.limit || 20;

    const qb = this.userRepo
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.name',
        'user.email',
        'user.role',
        'user.is_active',
        'user.created_at',
        'user.updated_at',
      ])
      .orderBy('user.created_at', 'DESC');

    if (options.role) {
      qb.andWhere('user.role = :role', { role: options.role });
    }
    if (options.is_active !== undefined) {
      qb.andWhere('user.is_active = :is_active', {
        is_active: options.is_active,
      });
    }
    if (options.search) {
      qb.andWhere('(user.name ILIKE :search OR user.email ILIKE :search)', {
        search: `%${options.search}%`,
      });
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
    const user = await this.userRepo.findOne({
      where: { id },
      select: [
        'id',
        'name',
        'email',
        'role',
        'is_active',
        'failed_attempts',
        'locked_until',
        'created_at',
        'updated_at',
      ],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    currentUser: { id: string; role: string },
  ) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent user from changing their own role
    if (dto.role && id === currentUser.id) {
      throw new ForbiddenException('Cannot change your own role');
    }

    // Prevent user from deactivating themselves
    if (dto.is_active === false && id === currentUser.id) {
      throw new ForbiddenException('Cannot deactivate your own account');
    }

    const oldData = {
      name: user.name,
      role: user.role,
      is_active: user.is_active,
    };

    Object.assign(user, dto);
    const saved = await this.userRepo.save(user);

    const actionType =
      dto.is_active === false
        ? ActionType.USER_DEACTIVATE
        : dto.is_active === true
          ? ActionType.USER_ACTIVATE
          : ActionType.USER_UPDATE;

    await this.activityLogService.log({
      user_id: currentUser.id,
      action_type: actionType,
      entity_type: 'User',
      entity_id: saved.id,
      old_data: oldData,
      new_data: {
        name: saved.name,
        role: saved.role,
        is_active: saved.is_active,
      },
    });

    const { password_hash, ...result } = saved;
    return result;
  }

  async resetPassword(userId: string, dto: ResetPasswordDto, adminId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const rounds = this.configService.get<number>('BCRYPT_ROUNDS', 12);
    user.password_hash = await bcrypt.hash(dto.new_password, rounds);
    user.failed_attempts = 0;
    user.locked_until = null;

    await this.userRepo.save(user);

    // Increment token version to force re-login
    await this.userRepo.increment({ id: userId }, 'token_version', 1);

    await this.activityLogService.log({
      user_id: adminId,
      action_type: ActionType.USER_PASSWORD_RESET,
      entity_type: 'User',
      entity_id: userId,
      new_data: { reset_by: adminId },
    });

    return { message: 'Password reset successfully' };
  }

  async forceLogout(userId: string, adminId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.authService.forceLogoutUser(userId, adminId);
  }
}
