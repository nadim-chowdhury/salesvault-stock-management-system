import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login',
    description:
      'Authenticate with email and password. Returns JWT access token and refresh token.',
  })
  async login(@Body() dto: LoginDto, @Req() req: any) {
    const ip = req.ip || req.socket?.remoteAddress;
    const deviceInfo = req.headers?.['user-agent'];
    return this.authService.login(dto, ip, deviceInfo);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh token',
    description:
      'Exchange a valid refresh token for new access + refresh tokens (rotation).',
  })
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: any) {
    const ip = req.ip || req.socket?.remoteAddress;
    const deviceInfo = req.headers?.['user-agent'];
    return this.authService.refreshToken(dto.refresh_token, ip, deviceInfo);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Logout',
    description: 'Revoke refresh token(s) and end the session.',
  })
  async logout(
    @CurrentUser('id') userId: string,
    @Body() body: { refresh_token?: string },
    @Req() req: any,
  ) {
    const ip = req.ip || req.socket?.remoteAddress;
    const deviceInfo = req.headers?.['user-agent'];
    return this.authService.logout(userId, body.refresh_token, ip, deviceInfo);
  }
}
