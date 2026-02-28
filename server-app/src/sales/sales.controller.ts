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
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { PaymentStatus } from '../common/enums/payment-status.enum';

@Controller('sales')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @Roles(Role.SALESPERSON, Role.ADMIN, Role.MANAGER)
  async create(
    @Body() dto: CreateSaleDto,
    @CurrentUser('id') userId: string,
    @Req() req: any,
  ) {
    const ip = req.ip || req.socket?.remoteAddress;
    const deviceInfo = req.headers?.['user-agent'];
    return this.salesService.createSale(dto, userId, ip, deviceInfo);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER)
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('salesperson_id') salespersonId?: string,
    @Query('payment_status') paymentStatus?: PaymentStatus,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.salesService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      salesperson_id: salespersonId,
      payment_status: paymentStatus,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  @Get('my-sales')
  @Roles(Role.SALESPERSON)
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
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.salesService.findOne(id);
  }

  @Post(':id/cancel')
  @Roles(Role.ADMIN)
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.salesService.cancelSale(id, adminId);
  }
}
