import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable, InternalServerErrorException,
    UnauthorizedException,
} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {JwtService} from '@nestjs/jwt';
import {EventType, Severity, UserStatus} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {createHash, randomBytes} from 'crypto';
import {AuthPayloadDto, mapUserResponse, UserResponseDto} from '../../common/dto/user-response.dto';
import {PrismaService} from '../../database/prisma/prisma.service';
import {SecurityAuditLogger} from '../../integrations/logger/security-audit-logger.service';
import {LoginAttemptRepository} from '../../repositories/login-attempt.repository';
import {RefreshTokenRepository} from '../../repositories/refresh-token.repository';
import {RoleRepository} from '../../repositories/role.repository';
import {SecurityEventRepository} from '../../repositories/security-event.repository';
import {UserRepository} from '../../repositories/user.repository';
import {UserRoleRepository} from '../../repositories/user-role.repository';
import {UserWithRbac} from '../../repositories/user-rbac.types';
import {LoginDto} from './dto/login.dto';
import {RegisterDto} from './dto/register.dto';

// Interface for the service that handles authentication and authorization
interface IAuthService {
    // Create new user and immediately gives him access token
    register(dto: RegisterDto): Promise<AuthPayloadDto>

    // Login user
    login(dto: LoginDto, ipAddress?: string, userAgent?: string): Promise<AuthPayloadDto>;

    // Get current user's information
    me(userId: number): Promise<UserResponseDto>;

    // Refresh tokens and returns AuthPayloadDto with these tokens and user's context
    refresh(refreshToken: string): Promise<AuthPayloadDto>;

    // Log out user
    logout(userId: number, refreshToken: string): Promise<{ success: boolean }>;
}

@Injectable()
export class AuthService implements IAuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly userRepository: UserRepository,
        private readonly roleRepository: RoleRepository,
        private readonly userRoleRepository: UserRoleRepository,
        private readonly loginAttemptRepository: LoginAttemptRepository,
        private readonly securityEventRepository: SecurityEventRepository,
        private readonly refreshTokenRepository: RefreshTokenRepository,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly audit: SecurityAuditLogger,
    ) {
    }

    // Creates new user and immediately gives him access token
    async register(dto: RegisterDto): Promise<AuthPayloadDto> {
        // Input email normalization
        const emailLower = dto.email.toLowerCase();

        // Checking if user with this email already exists
        const exists = await this.userRepository.emailExists(emailLower);
        if (exists) throw new ConflictException('Email already exists');

        // Getting default 'user' role
        const userRole = await this.roleRepository.findByName('user');
        if (!userRole) throw new InternalServerErrorException("Default 'user' role isn't supporting at this moment. Please contact support.")

        // Hashing password
        const passwordHash = await bcrypt.hash(dto.password, 10);

        // Starting transaction
        const user = await this.prisma.client.$transaction(async (tx) => {
            // 1. Creating user in User model
            const created = await this.userRepository.create(
                {
                    email: emailLower,
                    passwordHash,
                    firstName: dto.firstName,
                    lastName: dto.lastName,
                },
                tx,
            );

            // 2. Inserting a new user-role pair
            await this.userRoleRepository.insertMany(
                [{userId: created.id, roleId: userRole.id}],
                tx,
            );

            // 3. Creating a new security event
            await this.securityEventRepository.create(
                {
                    userId: created.id,
                    eventType: EventType.USER_CREATED,
                    severity: Severity.LOW,
                    entityType: 'User',
                    entityId: String(created.id),
                    description: `Self-service registration: ${emailLower}`,
                },
                tx,
            );

            // 4. Returning a created user with rbac
            return this.userRepository.findByIdWithRbac(created.id, tx);
        });

        if (!user) throw new Error('User not found after registration');

        // Saving log about registering new user
        this.audit.userRegistered({
            userId: user.id,
            email: user.email,
        });

        // Returning payload
        return this.authPayload(user);
    }

    // Login user
    async login(
        dto: LoginDto,
        ipAddress?: string,
        userAgent?: string,
    ): Promise<AuthPayloadDto> {
        // Normalize email to avoid case-sensitive duplicates during lookup
        const email = dto.email.toLowerCase();

        // Load user together with roles/permissions
        const user = await this.userRepository.findByEmailWithRbac(email);

        let success = false;
        let reason: string | null = null;
        let shouldAuditLockout = false;
        let lockoutUntilIso: string | undefined;

        // Check whether login is allowed
        if (!user) {
            reason = 'User not found';
        } else if (user.status !== UserStatus.ACTIVE) {
            reason = `User status ${user.status}`;
        } else if (user.lockoutUntil && user.lockoutUntil > new Date()) {
            reason = `Account locked until ${user.lockoutUntil.toISOString()}`;
        } else if (!(await bcrypt.compare(dto.password, user.passwordHash))) {
            reason = 'Invalid credentials';
        } else {
            success = true;
        }

        // Read security config only once
        const maxFailedAttempts = this.configService.get<number>(
            'LOCKOUT_MAX_FAILED_ATTEMPTS',
            5,
        );
        const lockoutMinutes = this.configService.get<number>(
            'LOCKOUT_MINUTES',
            15,
        );

        // Starting transaction
        await this.prisma.client.$transaction(async (tx) => {
            if (user) {
                if (success) {
                    // Successful login resets failed attempts and removes lockout
                    await this.userRepository.updateFields(
                        user.id,
                        {
                            failedLoginCount: 0,
                            lockoutUntil: null,
                        },
                        tx,
                    );
                } else {
                    // Increase failed attempts counter for this user
                    const failedLoginCount = user.failedLoginCount + 1;
                    const shouldLock = failedLoginCount >= maxFailedAttempts;

                    const lockoutUntil = shouldLock
                        ? new Date(Date.now() + lockoutMinutes * 60 * 1000)
                        : user.lockoutUntil;

                    // If max attempts reached, reset counter and set lockout time
                    await this.userRepository.updateFields(
                        user.id,
                        {
                            failedLoginCount: shouldLock ? 0 : failedLoginCount,
                            lockoutUntil,
                        },
                        tx,
                    );

                    // Save data for audit logging after transaction
                    if (shouldLock && lockoutUntil) {
                        shouldAuditLockout = true;
                        lockoutUntilIso = lockoutUntil.toISOString();
                    }
                }
            }

            // Store login attempt history
            await this.loginAttemptRepository.create(
                {
                    userId: user?.id,
                    email,
                    ipAddress,
                    userAgent,
                    success,
                    failureReason: reason,
                },
                tx,
            );

            // Store security event for auditing and reporting
            await this.securityEventRepository.create(
                {
                    userId: user?.id,
                    eventType: success ? EventType.LOGIN_SUCCESS : EventType.LOGIN_FAILURE,
                    severity: success ? Severity.LOW : Severity.MEDIUM,
                    entityType: 'Auth',
                    entityId: user ? String(user.id) : null,
                    description: success ? 'Login success' : `Login failure: ${reason}`,
                    ipAddress,
                    metadata: success
                        ? undefined
                        : reason && /Invalid credentials|User not found/i.test(reason)
                            ? { suspiciousAttempt: true }
                            : undefined,
                },
                tx,
            );
        });

        // Write audit log about account lockout after successful DB transaction
        if (shouldAuditLockout && user && lockoutUntilIso) {
            this.audit.accountLockout({
                userId: user.id,
                email,
                ip: ipAddress,
                until: lockoutUntilIso,
                metadata: {
                    failedLoginCount: user.failedLoginCount + 1,
                    maxFailedAttempts,
                },
            });
        }

        // Write audit log for login result
        if (success && user) {
            this.audit.loginSuccess({
                userId: user.id,
                email,
                ip: ipAddress,
            });
        } else {
            this.audit.loginFailure({
                userId: user?.id,
                email,
                ip: ipAddress,
                reason: reason ?? undefined,
            });
        }

        // Hide exact reason from client for security reasons
        if (!success || !user) {
            throw new UnauthorizedException('Invalid email or password');
        }

        // Return auth payload for successful login
        return this.authPayload(user);
    }

    // Get current user's information
    async me(userId: number): Promise<UserResponseDto> {
        const user = await this.userRepository.findByIdWithRbac(userId);

        // If user wasn't found or his status isn't 'ACTIVE', we should throw an error which frontend will hand and unauthorize user
        if (!user || user.status !== UserStatus.ACTIVE) {
            throw new UnauthorizedException('Invalid user');
        }

        return this.userContext(user);
    }

    // Format user's information (with RBAC) to UserResponseDto
    private userContext(user: UserWithRbac): UserResponseDto {
        // Get roles
        const roles = user.userRoles.map((x) => x.role.name);

        // Get permissions
        const permissions = [
            ...new Set(
                user.userRoles.flatMap((x) =>
                    x.role.rolePermissions.map((rp) => rp.permission.code),
                ),
            ),
        ];

        // Map to UserResponseDto
        return {...mapUserResponse(user), roles, permissions};
    }

    // Create tokens (access, refresh) and returns AuthPayloadDto with these tokens and user's context
    private async authPayload(user: UserWithRbac): Promise<AuthPayloadDto> {
        // Getting user context
        const ctx = this.userContext(user);
        if (!ctx) throw new BadRequestException("Invalid user");

        // Setting access token
        const accessToken = this.jwtService.sign({sub: ctx.id, email: ctx.email});

        // Setting refresh token
        const refreshToken = randomBytes(48).toString('hex');
        const refreshTtlDays = this.configService.get<number>(
            'REFRESH_TOKEN_TTL_DAYS',
            7,
        );
        const refreshTokenHash = this.hashToken(refreshToken);
        await this.refreshTokenRepository.create({
            userId: ctx.id,
            tokenHash: refreshTokenHash,
            expiresAt: new Date(Date.now() + refreshTtlDays * 24 * 60 * 60 * 1000),
        });

        // Return AuthPayloadDo
        return {
            accessToken,
            refreshToken,
            tokenType: 'Bearer',
            user: ctx,
        };
    }

    // Refresh tokens and returns AuthPayloadDto with these tokens and user's context
    async refresh(refreshToken: string): Promise<AuthPayloadDto> {
        // Getting hash from refresh token
        const tokenHash = this.hashToken(refreshToken);

        // Trying to find active in table
        const existing = await this.refreshTokenRepository.findActiveByTokenHash(
            tokenHash,
        );

        if (!existing || existing.expiresAt < new Date()) {
            throw new UnauthorizedException('Invalid refresh token');
        }

        // Getting user's read model
        const user = await this.userRepository.findByIdWithRbac(existing.userId);
        if (!user || user.status !== UserStatus.ACTIVE) {
            throw new ForbiddenException('User is not active');
        }

        // Creating new refresh tokens
        const nextRefreshToken = randomBytes(48).toString('hex');
        const nextTokenHash = this.hashToken(nextRefreshToken);
        const refreshTtlDays = this.configService.get<number>(
            'REFRESH_TOKEN_TTL_DAYS',
            7,
        );

        // Starting transaction
        await this.prisma.client.$transaction(async (tx) => {
            const replacement = await this.refreshTokenRepository.create(
                {
                    userId: existing.userId,
                    tokenHash: nextTokenHash,
                    expiresAt: new Date(
                        Date.now() + refreshTtlDays * 24 * 60 * 60 * 1000,
                    ),
                },
                tx,
            );
            await this.refreshTokenRepository.markRevoked(existing.id, replacement.id, tx);
        });

        // Getting user's context
        const ctx = this.userContext(user);

        // Signing new access token
        const accessToken = this.jwtService.sign({sub: ctx.id, email: ctx.email});

        return {
            accessToken,
            refreshToken: nextRefreshToken,
            tokenType: 'Bearer',
            user: ctx,
        };
    }

    // Log out user
    async logout(userId: number, refreshToken: string): Promise<{success: boolean}> {
        const tokenHash = this.hashToken(refreshToken);
        await this.refreshTokenRepository.revokeAllActiveForUser(userId, tokenHash);
        return {success: true};
    }

    private hashToken(token: string) {
        return createHash('sha256').update(token).digest('hex');
    }
}
