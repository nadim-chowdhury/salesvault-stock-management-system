import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('Dashboard')
@ApiBearerAuth('JWT-auth')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('admin')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Admin dashboard',
    description:
      'Sales today/monthly, low stock alerts, top salespersons, recent system activity',
  })
  async getAdminDashboard() {
    return this.dashboardService.getAdminDashboard();
  }

  @Get('salesperson')
  @Roles(Role.SALESPERSON)
  @ApiOperation({
    summary: 'Salesperson dashboard',
    description:
      'My sales today, assigned stock overview, recent personal activity',
  })
  async getSalespersonDashboard(@CurrentUser('id') userId: string) {
    return this.dashboardService.getSalespersonDashboard(userId);
  }
}
