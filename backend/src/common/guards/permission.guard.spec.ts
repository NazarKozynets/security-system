import { ForbiddenException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SecurityAuditLogger } from '../../integrations/logger/security-audit-logger.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PermissionGuard } from './permission.guard';

function mockContext(
  user: unknown,
  url = '/test',
  method = 'GET',
): ExecutionContext {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ user, ip: '127.0.0.1', url, method }),
    }),
  } as unknown as ExecutionContext;
}

describe('PermissionGuard', () => {
  const audit: Pick<SecurityAuditLogger, 'accessDenied'> = {
    accessDenied: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows when no permissions and no roles required', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockImplementation((key: string) => {
        if (key === PERMISSIONS_KEY) return [];
        if (key === ROLES_KEY) return [];
        return undefined;
      }),
    } as unknown as Reflector;
    const guard = new PermissionGuard(reflector, audit as SecurityAuditLogger);
    expect(guard.canActivate(mockContext({ permissions: [], roles: [] }))).toBe(
      true,
    );
    expect(audit.accessDenied).not.toHaveBeenCalled();
  });

  it('allows when user has required permissions', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockImplementation((key: string) => {
        if (key === PERMISSIONS_KEY) return ['user.read'];
        if (key === ROLES_KEY) return [];
        return undefined;
      }),
    } as unknown as Reflector;
    const guard = new PermissionGuard(reflector, audit as SecurityAuditLogger);
    expect(
      guard.canActivate(
        mockContext({
          id: 1,
          email: 'a@b.c',
          permissions: ['user.read'],
          roles: ['admin'],
        }),
      ),
    ).toBe(true);
  });

  it('throws and audits when permission missing', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockImplementation((key: string) => {
        if (key === PERMISSIONS_KEY) return ['user.read'];
        if (key === ROLES_KEY) return [];
        return undefined;
      }),
    } as unknown as Reflector;
    const guard = new PermissionGuard(reflector, audit as SecurityAuditLogger);
    expect(() =>
      guard.canActivate(mockContext({ id: 2, permissions: [], roles: [] })),
    ).toThrow(ForbiddenException);
    expect(audit.accessDenied).toHaveBeenCalled();
  });

  it('throws when role required but user lacks role', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockImplementation((key: string) => {
        if (key === PERMISSIONS_KEY) return [];
        if (key === ROLES_KEY) return ['admin'];
        return undefined;
      }),
    } as unknown as Reflector;
    const guard = new PermissionGuard(reflector, audit as SecurityAuditLogger);
    expect(() =>
      guard.canActivate(mockContext({ permissions: ['x'], roles: ['user'] })),
    ).toThrow(ForbiddenException);
  });
});
