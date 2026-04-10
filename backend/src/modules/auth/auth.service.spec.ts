import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { SecurityAuditLogger } from '../../integrations/logger/security-audit-logger.service';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  ...jest.requireActual<typeof import('bcrypt')>('bcrypt'),
  compare: jest.fn(),
  hash: jest.fn(),
}));

const mockedCompare = bcrypt.compare as jest.MockedFunction<
  typeof bcrypt.compare
>;
const mockedHash = bcrypt.hash as jest.MockedFunction<typeof bcrypt.hash>;

describe('AuthService', () => {
  const audit = {
    loginSuccess: jest.fn(),
    loginFailure: jest.fn(),
    accountLockout: jest.fn(),
    userRegistered: jest.fn(),
  };

  const defaultPrisma = () => ({
    client: {
      $transaction: jest.fn(async (fn: any) => fn({})),
    },
  });

  const buildService = (deps: {
    prisma?: any;
    userRepository?: any;
    roleRepository?: any;
    userRoleRepository?: any;
    loginAttemptRepository?: any;
    securityEventRepository?: any;
    refreshTokenRepository?: any;
  }) => {
    const jwt = {
      sign: jest.fn().mockReturnValue('jwt'),
    } as unknown as JwtService;
    const config = {
      get: jest.fn((k: string, d?: any) => d),
      getOrThrow: jest.fn().mockReturnValue('secret'),
    } as unknown as ConfigService;
    return new AuthService(
      deps.prisma ?? defaultPrisma(),
      deps.userRepository ?? {},
      deps.roleRepository ?? {},
      deps.userRoleRepository ?? {},
      deps.loginAttemptRepository ?? {},
      deps.securityEventRepository ?? {},
      deps.refreshTokenRepository ?? {},
      jwt,
      config,
      audit as unknown as SecurityAuditLogger,
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs success and resets failed count on valid login', async () => {
    mockedCompare.mockResolvedValue(true as never);
    const passwordHash = 'stored-hash';
    const user = {
      id: 1,
      email: 'u@test.local',
      passwordHash,
      status: UserStatus.ACTIVE,
      failedLoginCount: 2,
      lockoutUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      userRoles: [
        {
          role: {
            id: 1,
            name: 'user',
            rolePermissions: [{ permission: { code: 'x' } }],
          },
        },
      ],
    };
    const userRepository = {
      findByEmailWithRbac: jest.fn().mockResolvedValue(user),
      updateFields: jest.fn().mockResolvedValue(undefined),
    };
    const loginAttemptRepository = { create: jest.fn() };
    const securityEventRepository = { create: jest.fn() };
    const refreshTokenRepository = { create: jest.fn() };
    const service = buildService({
      userRepository,
      loginAttemptRepository,
      securityEventRepository,
      refreshTokenRepository,
    });
    await service.login(
      { email: 'u@test.local', password: 'password123' },
      '10.0.0.1',
      'ua',
    );
    expect(audit.loginSuccess).toHaveBeenCalled();
    expect(userRepository.updateFields).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        failedLoginCount: 0,
        lockoutUntil: null,
      }),
    );
  });

  it('logs failure when password wrong', async () => {
    mockedCompare.mockResolvedValue(false as never);
    const passwordHash = 'stored-hash';
    const user = {
      id: 2,
      email: 'u2@test.local',
      passwordHash,
      status: UserStatus.ACTIVE,
      failedLoginCount: 0,
      lockoutUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      userRoles: [
        {
          role: {
            id: 1,
            name: 'user',
            rolePermissions: [],
          },
        },
      ],
    };
    const userRepository = {
      findByEmailWithRbac: jest.fn().mockResolvedValue(user),
      updateFields: jest.fn().mockResolvedValue(undefined),
    };
    const service = buildService({
      userRepository,
      loginAttemptRepository: { create: jest.fn() },
      securityEventRepository: { create: jest.fn() },
    });
    await expect(
      service.login({ email: 'u2@test.local', password: 'password123' }),
    ).rejects.toBeDefined();
    expect(audit.loginFailure).toHaveBeenCalled();
  });

  it('registers a new user, records audit and security event', async () => {
    mockedHash.mockResolvedValue('hashed' as never);
    const createdUser = {
      id: 99,
      email: 'new@test.local',
      passwordHash: 'hashed',
      firstName: 'A',
      lastName: 'B',
      status: UserStatus.ACTIVE,
      failedLoginCount: 0,
      lockoutUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      userRoles: [
        {
          role: {
            id: 1,
            name: 'user',
            rolePermissions: [],
          },
        },
      ],
    };
    const userRepository = {
      emailExists: jest.fn().mockResolvedValue(false),
      create: jest.fn().mockResolvedValue({ id: 99 }),
      findByIdWithRbac: jest.fn().mockResolvedValue(createdUser),
    };
    const roleRepository = {
      findByName: jest.fn().mockResolvedValue({ id: 1, name: 'user' }),
    };
    const userRoleRepository = { insertMany: jest.fn() };
    const securityEventRepository = { create: jest.fn() };
    const refreshTokenRepository = { create: jest.fn() };
    const service = buildService({
      userRepository,
      roleRepository,
      userRoleRepository,
      securityEventRepository,
      refreshTokenRepository,
    });
    const result = await service.register({
      email: 'new@test.local',
      password: 'password123',
      firstName: 'A',
      lastName: 'B',
    });
    expect(mockedHash).toHaveBeenCalledWith('password123', 10);
    expect(securityEventRepository.create).toHaveBeenCalled();
    expect(audit.userRegistered).toHaveBeenCalledWith({
      userId: 99,
      email: 'new@test.local',
    });
    expect(result.accessToken).toBe('jwt');
  });

  it('register throws when email already exists', async () => {
    const userRepository = {
      emailExists: jest.fn().mockResolvedValue(true),
    };
    const service = buildService({ userRepository });
    await expect(
      service.register({
        email: 'taken@test.local',
        password: 'password123',
        firstName: 'A',
        lastName: 'B',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('validateJwtUser returns context for active user', async () => {
    const user = {
      id: 5,
      email: 'a@test.local',
      firstName: 'A',
      lastName: 'B',
      passwordHash: 'h',
      status: UserStatus.ACTIVE,
      failedLoginCount: 0,
      lockoutUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      userRoles: [
        {
          role: {
            id: 1,
            name: 'user',
            rolePermissions: [{ permission: { code: 'p1' } }],
          },
        },
      ],
    };
    const userRepository = {
      findByIdWithRbac: jest.fn().mockResolvedValue(user),
    };
    const service = buildService({ userRepository });
    const ctx = await service.validateJwtUser(5);
    expect(ctx.id).toBe(5);
    expect(ctx.roles).toContain('user');
    expect(ctx.permissions).toContain('p1');
  });

  it('validateJwtUser throws when user missing or inactive', async () => {
    const userRepository = {
      findByIdWithRbac: jest.fn().mockResolvedValue(null),
    };
    const service = buildService({ userRepository });
    await expect(service.validateJwtUser(1)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    const userRepository2 = {
      findByIdWithRbac: jest.fn().mockResolvedValue({
        id: 1,
        email: 'x',
        firstName: 'a',
        lastName: 'b',
        passwordHash: 'h',
        status: UserStatus.BLOCKED,
        failedLoginCount: 0,
        lockoutUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        userRoles: [],
      }),
    };
    const service2 = buildService({ userRepository: userRepository2 });
    await expect(service2.validateJwtUser(1)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('me delegates to validateJwtUser', async () => {
    const user = {
      id: 1,
      email: 'm@test.local',
      firstName: 'M',
      lastName: 'E',
      passwordHash: 'h',
      status: UserStatus.ACTIVE,
      failedLoginCount: 0,
      lockoutUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      userRoles: [{ role: { id: 1, name: 'user', rolePermissions: [] } }],
    };
    const userRepository = {
      findByIdWithRbac: jest.fn().mockResolvedValue(user),
    };
    const service = buildService({ userRepository });
    const ctx = await service.me(1);
    expect(ctx.email).toBe('m@test.local');
  });

  it('refresh returns new tokens when refresh token valid', async () => {
    const user = {
      id: 2,
      email: 'r@test.local',
      firstName: 'R',
      lastName: 'T',
      passwordHash: 'h',
      status: UserStatus.ACTIVE,
      failedLoginCount: 0,
      lockoutUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      userRoles: [{ role: { id: 1, name: 'user', rolePermissions: [] } }],
    };
    const existing = {
      id: 10,
      userId: 2,
      expiresAt: new Date(Date.now() + 86400000),
      tokenHash: 'h',
      revokedAt: null,
      replacedById: null,
      createdAt: new Date(),
    };
    const prisma = {
      client: {
        $transaction: jest.fn(async (fn: any) => fn({})),
      },
    };
    const refreshTokenRepository = {
      findActiveByTokenHash: jest.fn().mockResolvedValue(existing),
      create: jest.fn().mockResolvedValue({ id: 11 }),
      markRevoked: jest.fn(),
    };
    const userRepository = {
      findByIdWithRbac: jest.fn().mockResolvedValue(user),
    };
    const service = buildService({ prisma, refreshTokenRepository, userRepository });
    const out = await service.refresh('raw-refresh-token');
    expect(out.accessToken).toBe('jwt');
    expect(out.refreshToken).toBeDefined();
    expect(out.user.email).toBe('r@test.local');
    expect(refreshTokenRepository.markRevoked).toHaveBeenCalled();
  });

  it('refresh throws when token invalid or expired', async () => {
    const refreshTokenRepository = {
      findActiveByTokenHash: jest.fn().mockResolvedValue(null),
    };
    const service = buildService({ refreshTokenRepository });
    await expect(service.refresh('bad')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    const refreshTokenRepository2 = {
      findActiveByTokenHash: jest.fn().mockResolvedValue({
        id: 1,
        userId: 1,
        expiresAt: new Date(0),
        tokenHash: 'h',
        revokedAt: null,
        replacedById: null,
        createdAt: new Date(),
      }),
    };
    const service2 = buildService({
      refreshTokenRepository: refreshTokenRepository2,
    });
    await expect(service2.refresh('expired')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('refresh throws Forbidden when user not active', async () => {
    const user = {
      id: 1,
      email: 'x',
      firstName: 'a',
      lastName: 'b',
      passwordHash: 'h',
      status: UserStatus.DISABLED,
      failedLoginCount: 0,
      lockoutUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      userRoles: [],
    };
    const refreshTokenRepository = {
      findActiveByTokenHash: jest.fn().mockResolvedValue({
        id: 1,
        userId: 1,
        expiresAt: new Date(Date.now() + 86400000),
        tokenHash: 'h',
        revokedAt: null,
        replacedById: null,
        createdAt: new Date(),
      }),
    };
    const userRepository = {
      findByIdWithRbac: jest.fn().mockResolvedValue(user),
    };
    const service = buildService({ refreshTokenRepository, userRepository });
    await expect(service.refresh('tok')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('logout revokes refresh token', async () => {
    const refreshTokenRepository = {
      revokeAllActiveForUser: jest.fn().mockResolvedValue(undefined),
    };
    const service = buildService({ refreshTokenRepository });
    const out = await service.logout(1, 'some-refresh');
    expect(out.success).toBe(true);
    expect(refreshTokenRepository.revokeAllActiveForUser).toHaveBeenCalled();
  });
});
