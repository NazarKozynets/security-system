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

  const buildService = (prisma: any) => {
    const jwt = {
      sign: jest.fn().mockReturnValue('jwt'),
    } as unknown as JwtService;
    const config = {
      get: jest.fn((k: string, d?: any) => d),
      getOrThrow: jest.fn().mockReturnValue('secret'),
    } as unknown as ConfigService;
    return new AuthService(
      prisma,
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
      userRoles: [
        {
          role: {
            name: 'user',
            rolePermissions: [{ permission: { code: 'x' } }],
          },
        },
      ],
    };
    const prisma: any = {
      user: {
        findUnique: jest.fn().mockResolvedValue(user),
        update: jest.fn().mockResolvedValue(user),
      },
      loginAttempt: { create: jest.fn() },
      securityEvent: { create: jest.fn() },
      refreshToken: { create: jest.fn() },
    };
    const service = buildService(prisma);
    await service.login(
      { email: 'u@test.local', password: 'password123' },
      '10.0.0.1',
      'ua',
    );
    expect(audit.loginSuccess).toHaveBeenCalled();
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          failedLoginCount: 0,
          lockoutUntil: null,
        }),
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
      userRoles: [
        {
          role: {
            name: 'user',
            rolePermissions: [],
          },
        },
      ],
    };
    const prisma: any = {
      user: {
        findUnique: jest.fn().mockResolvedValue(user),
        update: jest.fn().mockResolvedValue(user),
      },
      loginAttempt: { create: jest.fn() },
      securityEvent: { create: jest.fn() },
    };
    const service = buildService(prisma);
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
      userRoles: [
        {
          role: {
            name: 'user',
            rolePermissions: [],
          },
        },
      ],
    };
    const prisma: any = {
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(createdUser),
      },
      role: {
        findUnique: jest.fn().mockResolvedValue({ id: 1, name: 'user' }),
      },
      securityEvent: { create: jest.fn() },
      refreshToken: { create: jest.fn() },
    };
    const service = buildService(prisma);
    const result = await service.register({
      email: 'new@test.local',
      password: 'password123',
      firstName: 'A',
      lastName: 'B',
    });
    expect(mockedHash).toHaveBeenCalledWith('password123', 10);
    expect(prisma.securityEvent.create).toHaveBeenCalled();
    expect(audit.userRegistered).toHaveBeenCalledWith({
      userId: 99,
      email: 'new@test.local',
    });
    expect(result.accessToken).toBe('jwt');
  });

  it('register throws when email already exists', async () => {
    const prisma: any = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 1, email: 'taken@test.local' }),
      },
    };
    const service = buildService(prisma);
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
      status: UserStatus.ACTIVE,
      userRoles: [
        {
          role: {
            name: 'user',
            rolePermissions: [{ permission: { code: 'p1' } }],
          },
        },
      ],
    };
    const prisma: any = {
      user: { findUnique: jest.fn().mockResolvedValue(user) },
    };
    const service = buildService(prisma);
    const ctx = await service.validateJwtUser(5);
    expect(ctx.id).toBe(5);
    expect(ctx.roles).toContain('user');
    expect(ctx.permissions).toContain('p1');
  });

  it('validateJwtUser throws when user missing or inactive', async () => {
    const prisma: any = {
      user: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const service = buildService(prisma);
    await expect(service.validateJwtUser(1)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    const prisma2: any = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 1,
          status: UserStatus.BLOCKED,
          userRoles: [],
        }),
      },
    };
    const service2 = buildService(prisma2);
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
      status: UserStatus.ACTIVE,
      userRoles: [
        { role: { name: 'user', rolePermissions: [] } },
      ],
    };
    const prisma: any = {
      user: { findUnique: jest.fn().mockResolvedValue(user) },
    };
    const service = buildService(prisma);
    const ctx = await service.me(1);
    expect(ctx.email).toBe('m@test.local');
  });

  it('refresh returns new tokens when refresh token valid', async () => {
    const user = {
      id: 2,
      email: 'r@test.local',
      status: UserStatus.ACTIVE,
      userRoles: [
        { role: { name: 'user', rolePermissions: [] } },
      ],
    };
    const existing = {
      id: 10,
      userId: 2,
      expiresAt: new Date(Date.now() + 86400000),
      user,
    };
    const prisma: any = {
      refreshToken: {
        findFirst: jest.fn().mockResolvedValue(existing),
        create: jest.fn().mockResolvedValue({ id: 11 }),
        update: jest.fn(),
      },
    };
    const service = buildService(prisma);
    const out = await service.refresh('raw-refresh-token');
    expect(out.accessToken).toBe('jwt');
    expect(out.refreshToken).toBeDefined();
    expect(out.user.email).toBe('r@test.local');
    expect(prisma.refreshToken.update).toHaveBeenCalled();
  });

  it('refresh throws when token invalid or expired', async () => {
    const prisma: any = {
      refreshToken: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = buildService(prisma);
    await expect(service.refresh('bad')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    const prisma2: any = {
      refreshToken: {
        findFirst: jest.fn().mockResolvedValue({
          id: 1,
          expiresAt: new Date(0),
          user: {
            status: UserStatus.ACTIVE,
            userRoles: [],
          },
        }),
      },
    };
    const service2 = buildService(prisma2);
    await expect(service2.refresh('expired')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('refresh throws Forbidden when user not active', async () => {
    const prisma: any = {
      refreshToken: {
        findFirst: jest.fn().mockResolvedValue({
          id: 1,
          expiresAt: new Date(Date.now() + 86400000),
          user: {
            status: UserStatus.DISABLED,
            userRoles: [],
          },
        }),
      },
    };
    const service = buildService(prisma);
    await expect(service.refresh('tok')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('logout revokes refresh token', async () => {
    const prisma: any = {
      refreshToken: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const service = buildService(prisma);
    const out = await service.logout(1, 'some-refresh');
    expect(out.success).toBe(true);
    expect(prisma.refreshToken.updateMany).toHaveBeenCalled();
  });
});
