import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'crypto';
import { User } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { ActionType } from '../common/enums/action-type.enum';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async login(dto: LoginDto, ip?: string, deviceInfo?: string) {
    const user = await this.userRepo.findOne({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.is_active) {
      throw new ForbiddenException('Account is deactivated. Contact admin.');
    }

    // Check if account is locked
    if (user.locked_until && user.locked_until > new Date()) {
      const minutesLeft = Math.ceil(
        (user.locked_until.getTime() - Date.now()) / 60000,
      );
      throw new ForbiddenException(
        `Account is locked. Try again in ${minutesLeft} minute(s).`,
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.password_hash,
    );

    if (!isPasswordValid) {
      await this.handleFailedLogin(user, ip, deviceInfo);
      throw new UnauthorizedException('Invalid email or password');
    }

    // Reset failed attempts on successful login
    if (user.failed_attempts > 0) {
      await this.userRepo.update(user.id, {
        failed_attempts: 0,
        locked_until: null,
      });
    }

    // Generate tokens
    const tokens = await this.generateTokens(user, ip, deviceInfo);

    // Log successful login
    await this.activityLogService.log({
      user_id: user.id,
      action_type: ActionType.LOGIN,
      entity_type: 'User',
      entity_id: user.id,
      new_data: { ip, device_info: deviceInfo },
      ip_address: ip,
      device_info: deviceInfo,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      ...tokens,
    };
  }

  async refreshToken(
    refreshTokenValue: string,
    ip?: string,
    deviceInfo?: string,
  ) {
    const tokenHash = this.hashToken(refreshTokenValue);

    const storedToken = await this.refreshTokenRepo.findOne({
      where: { token_hash: tokenHash, is_revoked: false },
      relations: ['user'],
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (storedToken.expires_at < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    if (!storedToken.user.is_active) {
      throw new ForbiddenException('Account is deactivated');
    }

    // Revoke the old refresh token (Strict rotation)
    storedToken.is_revoked = true;
    await this.refreshTokenRepo.save(storedToken);

    // Generate new access and refresh tokens
    const tokens = await this.generateTokens(storedToken.user, ip, deviceInfo);

    // Log token refresh
    await this.activityLogService.log({
      user_id: storedToken.user.id,
      action_type: ActionType.TOKEN_REFRESH,
      entity_type: 'RefreshToken',
      entity_id: storedToken.id,
      ip_address: ip,
      device_info: deviceInfo,
    });

    return tokens;
  }

  async logout(
    userId: string,
    refreshTokenValue?: string,
    ip?: string,
    deviceInfo?: string,
  ) {
    if (refreshTokenValue) {
      const tokenHash = this.hashToken(refreshTokenValue);
      await this.refreshTokenRepo.update(
        { token_hash: tokenHash, user_id: userId },
        { is_revoked: true },
      );
    } else {
      // Revoke all refresh tokens for the user
      await this.refreshTokenRepo.update(
        { user_id: userId, is_revoked: false },
        { is_revoked: true },
      );
    }

    await this.activityLogService.log({
      user_id: userId,
      action_type: ActionType.LOGOUT,
      entity_type: 'User',
      entity_id: userId,
      ip_address: ip,
      device_info: deviceInfo,
    });

    return { message: 'Logged out successfully' };
  }

  async forceLogoutUser(userId: string, adminId: string) {
    // Increment token version → invalidates ALL existing JWTs
    await this.userRepo.increment({ id: userId }, 'token_version', 1);

    // Revoke all refresh tokens
    await this.refreshTokenRepo.update(
      { user_id: userId, is_revoked: false },
      { is_revoked: true },
    );

    await this.activityLogService.log({
      user_id: adminId,
      action_type: ActionType.USER_FORCE_LOGOUT,
      entity_type: 'User',
      entity_id: userId,
      new_data: { forced_by: adminId },
    });

    return { message: 'User has been force logged out' };
  }

  // ─── Private Helpers ──────────────────────────────────────

  private async handleFailedLogin(
    user: User,
    ip?: string,
    deviceInfo?: string,
  ) {
    const maxAttempts = this.configService.get<number>('MAX_LOGIN_ATTEMPTS', 5);
    const lockDurationMinutes = this.configService.get<number>(
      'LOCK_DURATION_MINUTES',
      30,
    );

    const newFailedAttempts = user.failed_attempts + 1;
    const updateData: Partial<User> = { failed_attempts: newFailedAttempts };

    if (newFailedAttempts >= maxAttempts) {
      updateData.locked_until = new Date(
        Date.now() + lockDurationMinutes * 60 * 1000,
      );

      await this.activityLogService.log({
        user_id: user.id,
        action_type: ActionType.ACCOUNT_LOCKED,
        entity_type: 'User',
        entity_id: user.id,
        new_data: {
          failed_attempts: newFailedAttempts,
          locked_until: updateData.locked_until,
        },
        ip_address: ip,
        device_info: deviceInfo,
      });

      this.logger.warn(
        `Account locked for user ${user.email} after ${newFailedAttempts} failed attempts`,
      );
    }

    await this.userRepo.update(user.id, updateData);

    // Log failed login
    await this.activityLogService.log({
      user_id: user.id,
      action_type: ActionType.LOGIN_FAILED,
      entity_type: 'User',
      entity_id: user.id,
      new_data: {
        failed_attempts: newFailedAttempts,
        ip,
        device_info: deviceInfo,
      },
      ip_address: ip,
      device_info: deviceInfo,
    });
  }

  private async generateTokens(user: User, ip?: string, deviceInfo?: string) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.token_version,
    };

    const accessToken = this.jwtService.sign(payload as any, {
      expiresIn: this.configService.get<string>(
        'JWT_ACCESS_EXPIRY',
        '15m',
      ) as any,
    });

    // Generate refresh token
    const refreshTokenValue = randomUUID() + '-' + randomUUID();
    const tokenHash = this.hashToken(refreshTokenValue);

    const expiresIn = this.configService.get<string>(
      'JWT_REFRESH_EXPIRY',
      '7d',
    );
    const expiresAt = new Date();
    const days = parseInt(expiresIn.replace('d', ''));
    expiresAt.setDate(expiresAt.getDate() + days);

    // Save refresh token
    const refreshToken = this.refreshTokenRepo.create({
      user_id: user.id,
      token_hash: tokenHash,
      device_info: deviceInfo,
      ip_address: ip,
      expires_at: expiresAt,
    });
    await this.refreshTokenRepo.save(refreshToken);

    return {
      access_token: accessToken,
      refresh_token: refreshTokenValue,
      expires_in: this.configService.get<string>('JWT_ACCESS_EXPIRY', '15m'),
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  // Cleanup expired tokens (run periodically)
  async cleanupExpiredTokens() {
    const result = await this.refreshTokenRepo.delete({
      expires_at: LessThan(new Date()),
    });
    this.logger.debug(`Cleaned up ${result.affected} expired refresh tokens`);
  }
}
