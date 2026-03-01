import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { SalesTargetsService } from './sales-targets.service';
import { CreateSalesTargetDto } from './dto/create-sales-target.dto';
import { UpdateSalesTargetDto } from './dto/update-sales-target.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('Sales Targets')
@ApiBearerAuth('JWT-auth')
@Controller('sales-targets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalesTargetsController {
  constructor(private readonly salesTargetsService: SalesTargetsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Create sales target',
    description:
      'Assign a sales target to a salesperson for a warehouse period',
  })
  async create(
    @Body() dto: CreateSalesTargetDto,
    @CurrentUser('id') managerId: string,
  ) {
    return this.salesTargetsService.create(dto, managerId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'List sales targets',
    description: 'Paginated list with optional filters',
  })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'salesperson_id', required: false })
  @ApiQuery({ name: 'warehouse_id', required: false })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('salesperson_id') salespersonId?: string,
    @Query('warehouse_id') warehouseId?: string,
  ) {
    return this.salesTargetsService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      salesperson_id: salespersonId,
      warehouse_id: warehouseId,
    });
  }

  @Get('my-targets')
  @Roles(Role.SALESPERSON)
  @ApiOperation({
    summary: 'My sales targets',
    description: 'View sales targets assigned to the logged-in salesperson',
  })
  async getMyTargets(@CurrentUser('id') userId: string) {
    return this.salesTargetsService.getMyTargets(userId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Get sales target by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.salesTargetsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Update sales target',
    description: 'Update target amount or period',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSalesTargetDto,
    @CurrentUser('id') managerId: string,
  ) {
    return this.salesTargetsService.update(id, dto, managerId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Delete sales target',
    description: 'Remove a sales target',
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') managerId: string,
  ) {
    return this.salesTargetsService.remove(id, managerId);
  }
}
