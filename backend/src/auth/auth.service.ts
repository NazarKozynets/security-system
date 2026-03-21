import {
  ForbiddenException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventType, Severity, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import { mapUserResponse } from '../common/dto/user-response.dto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (exists) throw new ConflictException('Email already exists');
    const userRole = await this.prisma.role.findUnique({ where: { name: 'user' } });
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        userRoles: userRole ? { create: [{ roleId: userRole.id }] } : undefined,
      },
      include: {
        userRoles: {
          include: {
            role: { include: { rolePermissions: { include: { permission: true } } } },
          },
        },
      },
    });
    return this.authPayload(user);
  }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const email = dto.email.toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        userRoles: {
          include: {
            role: { include: { rolePermissions: { include: { permission: true } } } },
          },
        },
      },
    });
    let success = false;
    let reason: string | null = null;
    if (!user) reason = 'User not found';
    else if (user.status !== UserStatus.ACTIVE) reason = `User status ${user.status}`;
    else if (user.lockoutUntil && user.lockoutUntil > new Date())
      reason = `Account locked until ${user.lockoutUntil.toISOString()}`;
    else if (!(await bcrypt.compare(dto.password, user.passwordHash)))
      reason = 'Invalid credentials';
    else success = true;

    if (user) {
      const maxFailedAttempts = this.configService.get<number>(
        'LOCKOUT_MAX_FAILED_ATTEMPTS',
        5,
      );
      const lockoutMinutes = this.configService.get<number>('LOCKOUT_MINUTES', 15);

      if (success) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { failedLoginCount: 0, lockoutUntil: null },
        });
      } else {
        const failedLoginCount = user.failedLoginCount + 1;
        const shouldLock = failedLoginCount >= maxFailedAttempts;
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginCount: shouldLock ? 0 : failedLoginCount,
            lockoutUntil: shouldLock
              ? new Date(Date.now() + lockoutMinutes * 60 * 1000)
              : user.lockoutUntil,
          },
        });
      }
    }

    await this.prisma.loginAttempt.create({
      data: {
        userId: user?.id,
        email,
        ipAddress,
        userAgent,
        success,
        failureReason: reason,
      },
    });
    await this.prisma.securityEvent.create({
      data: {
        userId: user?.id,
        eventType: success ? EventType.LOGIN_SUCCESS : EventType.LOGIN_FAILURE,
        severity: success ? Severity.LOW : Severity.MEDIUM,
        entityType: 'Auth',
        entityId: user ? String(user.id) : null,
        description: success ? 'Login success' : `Login failure: ${reason}`,
        ipAddress,
      },
    });
    if (!success || !user)
      throw new UnauthorizedException('Invalid email or password');
    return this.authPayload(user);
  }

  async validateJwtUser(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: { include: { rolePermissions: { include: { permission: true } } } },
          },
        },
      },
    });
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid user');
    }
    return this.userContext(user);
  }

  me(userId: number) {
    return this.validateJwtUser(userId);
  }

  private userContext(user: any) {
    const roles = user.userRoles.map((x: any) => x.role.name);
    const permissions = [
      ...new Set(
        user.userRoles.flatMap((x: any) =>
          x.role.rolePermissions.map((rp: any) => rp.permission.code),
        ),
      ),
    ];
    return { ...mapUserResponse(user), roles, permissions };
  }

  private async authPayload(user: any) {
    const ctx = this.userContext(user);
    const accessToken = this.jwtService.sign({ sub: ctx.id, email: ctx.email });
    const refreshToken = randomBytes(48).toString('hex');
    const refreshTtlDays = this.configService.get<number>('REFRESH_TOKEN_TTL_DAYS', 7);
    const refreshTokenHash = this.hashToken(refreshToken);

    await this.prisma.refreshToken.create({
      data: {
        userId: ctx.id,
        tokenHash: refreshTokenHash,
        expiresAt: new Date(Date.now() + refreshTtlDays * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      user: ctx,
    };
  }

  async refresh(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const existing = await this.prisma.refreshToken.findFirst({
      where: { tokenHash, revokedAt: null },
      include: {
        user: {
          include: {
            userRoles: {
              include: {
                role: { include: { rolePermissions: { include: { permission: true } } } },
              },
            },
          },
        },
      },
    });
    if (!existing || existing.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (existing.user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('User is not active');
    }

    const nextRefreshToken = randomBytes(48).toString('hex');
    const nextTokenHash = this.hashToken(nextRefreshToken);
    const refreshTtlDays = this.configService.get<number>('REFRESH_TOKEN_TTL_DAYS', 7);

    const replacement = await this.prisma.refreshToken.create({
      data: {
        userId: existing.userId,
        tokenHash: nextTokenHash,
        expiresAt: new Date(Date.now() + refreshTtlDays * 24 * 60 * 60 * 1000),
      },
    });

    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date(), replacedById: replacement.id },
    });

    const ctx = this.userContext(existing.user);
    const accessToken = this.jwtService.sign({ sub: ctx.id, email: ctx.email });

    return { accessToken, refreshToken: nextRefreshToken, tokenType: 'Bearer', user: ctx };
  }

  async logout(userId: number, refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { userId, tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
