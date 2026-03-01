import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WarehouseUsersService } from './warehouse-users.service';
import { AssignUserWarehouseDto } from './dto/assign-user-warehouse.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('Warehouse Users')
@ApiBearerAuth('JWT-auth')
@Controller('warehouse-users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WarehouseUsersController {
  constructor(private readonly warehouseUsersService: WarehouseUsersService) {}

  @Post('assign')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Assign user to warehouse',
    description:
      'Assign a salesperson or manager to a warehouse (ADMIN/MANAGER)',
  })
  async assign(
    @Body() dto: AssignUserWarehouseDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.warehouseUsersService.assignUser(dto, userId);
  }

  @Delete(':warehouseId/:userId')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Remove user from warehouse',
    description: 'Remove a user assignment from a warehouse (ADMIN/MANAGER)',
  })
  async remove(
    @Param('warehouseId', ParseUUIDPipe) warehouseId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.warehouseUsersService.removeUser(
      warehouseId,
      userId,
      currentUserId,
    );
  }

  @Get('warehouse/:warehouseId')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Get users assigned to warehouse',
    description: 'List all users assigned to a specific warehouse',
  })
  async getWarehouseUsers(
    @Param('warehouseId', ParseUUIDPipe) warehouseId: string,
  ) {
    return this.warehouseUsersService.getWarehouseUsers(warehouseId);
  }

  @Get('user/:userId')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Get warehouses assigned to user',
    description: 'List all warehouses assigned to a specific user',
  })
  async getUserWarehouses(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.warehouseUsersService.getUserWarehouses(userId);
  }

  @Get('my-warehouses')
  @ApiOperation({
    summary: 'My assigned warehouses',
    description: 'View warehouses assigned to the logged-in user',
  })
  async getMyWarehouses(@CurrentUser('id') userId: string) {
    return this.warehouseUsersService.getMyWarehouses(userId);
  }
}
