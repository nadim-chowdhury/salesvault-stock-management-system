import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { StockService } from './stock.service';
import { AddStockDto } from './dto/add-stock.dto';
import { AssignStockDto } from './dto/assign-stock.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('Stock')
@ApiBearerAuth('JWT-auth')
@Controller('stock')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Post('add')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Add stock',
    description: 'Add stock quantity to a product in a warehouse',
  })
  async addStock(@Body() dto: AddStockDto, @CurrentUser('id') userId: string) {
    return this.stockService.addStock(dto, userId);
  }

  @Post('assign')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Assign stock to salesperson',
    description:
      'Assign stock from warehouse to a salesperson. Uses pessimistic locking.',
  })
  async assignStock(
    @Body() dto: AssignStockDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.stockService.assignStock(dto, userId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'List warehouse stock',
    description: 'View stock levels with optional low-stock threshold filter',
  })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'warehouse_id', required: false })
  @ApiQuery({ name: 'product_id', required: false })
  @ApiQuery({ name: 'low_stock_threshold', required: false, type: Number })
  async getWarehouseStock(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('warehouse_id') warehouseId?: string,
    @Query('product_id') productId?: string,
    @Query('low_stock_threshold') threshold?: string,
  ) {
    return this.stockService.getWarehouseStock({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      warehouse_id: warehouseId,
      product_id: productId,
      low_stock_threshold: threshold ? parseInt(threshold, 10) : undefined,
    });
  }

  @Get('assignments')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'List stock assignments',
    description: 'View all stock assignments to salespersons',
  })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'salesperson_id', required: false })
  @ApiQuery({ name: 'product_id', required: false })
  async getAssignments(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('salesperson_id') salespersonId?: string,
    @Query('product_id') productId?: string,
  ) {
    return this.stockService.getAssignments({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      salesperson_id: salespersonId,
      product_id: productId,
    });
  }

  @Get('my-stock')
  @Roles(Role.SALESPERSON)
  @ApiOperation({
    summary: 'My assigned stock',
    description: 'View stock assigned to the logged-in salesperson',
  })
  async getMyStock(@CurrentUser('id') userId: string) {
    return this.stockService.getSalespersonStock(userId);
  }
}
