import { Controller, Post, Body, Get, Query, UseGuards, Req } from '@nestjs/common';
import { StockAdjustmentService } from './stock-adjustment.service';
import { CreateStockAdjustmentDto } from './dto/create-stock-adjustment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { Request } from 'express';

@Controller('stock-adjustments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StockAdjustmentController {
  constructor(private readonly adjustmentService: StockAdjustmentService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  async adjustStock(@Body() dto: CreateStockAdjustmentDto, @Req() req: Request) {
    const user = req.user as any;
    return this.adjustmentService.adjustStock(
      dto,
      user.id,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER)
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('warehouse_id') warehouseId?: string,
    @Query('product_id') productId?: string,
  ) {
    return this.adjustmentService.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      warehouse_id: warehouseId,
      product_id: productId,
    });
  }
}
