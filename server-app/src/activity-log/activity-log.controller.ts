import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ActivityLogService } from './activity-log.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { ActionType } from '../common/enums/action-type.enum';

@Controller('activity-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER)
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('user_id') user_id?: string,
    @Query('action_type') action_type?: ActionType,
    @Query('entity_type') entity_type?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.activityLogService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      user_id,
      action_type,
      entity_type,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  @Get('recent')
  @Roles(Role.ADMIN, Role.MANAGER)
  async getRecent(@Query('limit') limit?: string) {
    return this.activityLogService.getRecentActivity(
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('verify')
  @Roles(Role.ADMIN)
  async verifyIntegrity() {
    return this.activityLogService.verifyChainIntegrity();
  }
}
