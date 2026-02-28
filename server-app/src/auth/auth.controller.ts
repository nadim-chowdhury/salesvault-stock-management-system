import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: any) {
    const ip = req.ip || req.socket?.remoteAddress;
    const deviceInfo = req.headers?.['user-agent'];
    return this.authService.login(dto, ip, deviceInfo);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: any) {
    const ip = req.ip || req.socket?.remoteAddress;
    const deviceInfo = req.headers?.['user-agent'];
    return this.authService.refreshToken(dto.refresh_token, ip, deviceInfo);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
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
