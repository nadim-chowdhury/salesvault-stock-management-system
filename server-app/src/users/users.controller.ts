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
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Create user',
    description: 'Create a new user (ADMIN only)',
  })
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.usersService.create(dto, currentUserId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'List users',
    description: 'Paginated list of all users with optional filters',
  })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'role', required: false, enum: Role })
  @ApiQuery({ name: 'is_active', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('role') role?: string,
    @Query('is_active') isActive?: string,
    @Query('search') search?: string,
  ) {
    return this.usersService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      role,
      is_active: isActive !== undefined ? isActive === 'true' : undefined,
      search,
    });
  }

  @Get('me')
  @ApiOperation({
    summary: 'Get current user',
    description: 'Returns the authenticated user profile',
  })
  async getMe(@CurrentUser() user: any) {
    return this.usersService.findOne(user.id);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Get user by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Update user',
    description: 'Update user details (ADMIN only). Cannot change own role.',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.usersService.update(id, dto, currentUser);
  }

  @Post(':id/reset-password')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Reset user password',
    description: 'Force reset a user password (ADMIN only)',
  })
  async resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetPasswordDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.usersService.resetPassword(id, dto, adminId);
  }

  @Post(':id/force-logout')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Force logout user',
    description: 'Invalidate all tokens and sessions for a user (ADMIN only)',
  })
  async forceLogout(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.usersService.forceLogout(id, adminId);
  }
}
