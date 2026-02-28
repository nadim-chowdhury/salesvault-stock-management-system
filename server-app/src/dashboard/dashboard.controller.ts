import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('admin')
  @Roles(Role.ADMIN, Role.MANAGER)
  async getAdminDashboard() {
    return this.dashboardService.getAdminDashboard();
  }

  @Get('salesperson')
  @Roles(Role.SALESPERSON)
  async getSalespersonDashboard(@CurrentUser('id') userId: string) {
    return this.dashboardService.getSalespersonDashboard(userId);
  }
}
