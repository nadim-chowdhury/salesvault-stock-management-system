import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { ApproveSaleDto } from './dto/approve-sale.dto';
import { AssignSaleDto } from './dto/assign-sale.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { PaymentStatus } from '../common/enums/payment-status.enum';
import { SaleStatus } from '../common/enums/sale-status.enum';

@ApiTags('Sales')
@ApiBearerAuth('JWT-auth')
@Controller('sales')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @Roles(Role.SALESPERSON, Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Create sale',
    description:
      'Create a new sale transaction. Salesperson sales require warehouse assignment and are pending approval. Admin/Manager sales are auto-approved.',
  })
  async create(
    @Body() dto: CreateSaleDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Req() req: any,
  ) {
    const ip = req.ip || req.socket?.remoteAddress;
    const deviceInfo = req.headers?.['user-agent'];
    return this.salesService.createSale(dto, userId, userRole, ip, deviceInfo);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'List all sales',
    description:
      'Paginated list with filters by salesperson, status, payment status, warehouse, and date range',
  })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'salesperson_id', required: false })
  @ApiQuery({ name: 'payment_status', required: false, enum: PaymentStatus })
  @ApiQuery({ name: 'status', required: false, enum: SaleStatus })
  @ApiQuery({ name: 'warehouse_id', required: false })
  @ApiQuery({ name: 'from', required: false, description: 'ISO date string' })
  @ApiQuery({ name: 'to', required: false, description: 'ISO date string' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('salesperson_id') salespersonId?: string,
    @Query('payment_status') paymentStatus?: PaymentStatus,
    @Query('status') status?: SaleStatus,
    @Query('warehouse_id') warehouseId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.salesService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      salesperson_id: salespersonId,
      payment_status: paymentStatus,
      status,
      warehouse_id: warehouseId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  @Get('my-sales')
  @Roles(Role.SALESPERSON)
  @ApiOperation({
    summary: 'My sales',
    description: 'View sales made by the logged-in salesperson',
  })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getMySales(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.salesService.getMySales(userId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get sale by ID',
    description: 'Returns full sale details with line items and approval info',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.salesService.findOne(id);
  }

  @Post(':id/approve')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Approve sale',
    description: 'Approve a pending sale (ADMIN/MANAGER only)',
  })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') managerId: string,
  ) {
    return this.salesService.approveSale(id, managerId);
  }

  @Post(':id/reject')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Reject sale',
    description:
      'Reject a pending sale and restore stock to salesperson (ADMIN/MANAGER only)',
  })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveSaleDto,
    @CurrentUser('id') managerId: string,
  ) {
    return this.salesService.rejectSale(id, managerId, dto.notes);
  }

  @Post(':id/assign')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Assign sale to salesperson',
    description: 'Assign a sale to a specific salesperson (ADMIN/MANAGER only)',
  })
  async assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignSaleDto,
    @CurrentUser('id') managerId: string,
  ) {
    return this.salesService.assignSale(id, dto.salesperson_id, managerId);
  }

  @Post(':id/cancel')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Cancel sale',
    description:
      'Cancel a sale and restore stock to salesperson assignments (ADMIN/MANAGER only)',
  })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.salesService.cancelSale(id, adminId);
  }
}
