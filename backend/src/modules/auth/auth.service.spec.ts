import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { SecurityAuditLogger } from '../../integrations/logger/security-audit-logger.service';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  ...jest.requireActual<typeof import('bcrypt')>('bcrypt'),
  compare: jest.fn(),
}));

const mockedCompare = bcrypt.compare as jest.MockedFunction<
  typeof bcrypt.compare
>;

describe('AuthService', () => {
  const audit = {
    loginSuccess: jest.fn(),
    loginFailure: jest.fn(),
    accountLockout: jest.fn(),
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
});
