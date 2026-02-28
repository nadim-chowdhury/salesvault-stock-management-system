import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { ActivityLog } from '../entities/activity-log.entity';
import { ActionType } from '../common/enums/action-type.enum';

export interface CreateActivityLogDto {
  user_id?: string | null;
  action_type: ActionType;
  entity_type: string;
  entity_id?: string | null;
  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
  ip_address?: string | null;
  device_info?: string | null;
}

@Injectable()
export class ActivityLogService {
  private readonly logger = new Logger(ActivityLogService.name);

  constructor(
    @InjectRepository(ActivityLog)
    private readonly activityLogRepo: Repository<ActivityLog>,
  ) {}

  async log(dto: CreateActivityLogDto): Promise<ActivityLog> {
    // Get the last log entry to build the hash chain
    const lastLog = await this.activityLogRepo.findOne({
      where: {},
      order: { created_at: 'DESC' },
    });

    const previousHash = lastLog?.current_hash || null;

    // Build the record for hashing (without the hash fields)
    const recordForHash = {
      user_id: dto.user_id,
      action_type: dto.action_type,
      entity_type: dto.entity_type,
      entity_id: dto.entity_id,
      old_data: dto.old_data,
      new_data: dto.new_data,
      ip_address: dto.ip_address,
      device_info: dto.device_info,
      previous_hash: previousHash,
      timestamp: new Date().toISOString(),
    };

    const currentHash = createHash('sha256')
      .update((previousHash || '') + JSON.stringify(recordForHash))
      .digest('hex');

    const log = this.activityLogRepo.create({
      ...dto,
      previous_hash: previousHash,
      current_hash: currentHash,
    });

    const saved = await this.activityLogRepo.save(log);
    this.logger.debug(
      `Activity logged: ${dto.action_type} on ${dto.entity_type} by user ${dto.user_id}`,
    );
    return saved;
  }

  async findAll(options: {
    page?: number;
    limit?: number;
    user_id?: string;
    action_type?: ActionType;
    entity_type?: string;
    from?: Date;
    to?: Date;
  }) {
    const page = options.page || 1;
    const limit = options.limit || 20;

    const qb = this.activityLogRepo
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .orderBy('log.created_at', 'DESC');

    if (options.user_id) {
      qb.andWhere('log.user_id = :user_id', { user_id: options.user_id });
    }
    if (options.action_type) {
      qb.andWhere('log.action_type = :action_type', {
        action_type: options.action_type,
      });
    }
    if (options.entity_type) {
      qb.andWhere('log.entity_type = :entity_type', {
        entity_type: options.entity_type,
      });
    }
    if (options.from) {
      qb.andWhere('log.created_at >= :from', { from: options.from });
    }
    if (options.to) {
      qb.andWhere('log.created_at <= :to', { to: options.to });
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

  async getRecentActivity(limit: number = 20) {
    return this.activityLogRepo.find({
      relations: ['user'],
      order: { created_at: 'DESC' },
      take: limit,
    });
  }

  async getUserActivity(userId: string, limit: number = 10) {
    return this.activityLogRepo.find({
      where: { user_id: userId },
      relations: ['user'],
      order: { created_at: 'DESC' },
      take: limit,
    });
  }

  async verifyChainIntegrity(): Promise<{
    valid: boolean;
    totalRecords: number;
    checkedRecords: number;
    firstCorruptedId?: string;
  }> {
    const logs = await this.activityLogRepo.find({
      order: { created_at: 'ASC' },
    });

    let previousHash: string | null = null;

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];

      // Verify previous hash matches
      if (log.previous_hash !== previousHash) {
        return {
          valid: false,
          totalRecords: logs.length,
          checkedRecords: i + 1,
          firstCorruptedId: log.id,
        };
      }

      previousHash = log.current_hash;
    }

    return {
      valid: true,
      totalRecords: logs.length,
      checkedRecords: logs.length,
    };
  }
}
