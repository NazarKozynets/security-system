import { NotFoundException } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { SecurityAuditLogger } from '../../integrations/logger/security-audit-logger.service';
import { UsersService } from './users.service';

jest.mock('bcrypt', () => ({
  ...jest.requireActual<typeof import('bcrypt')>('bcrypt'),
  hash: jest.fn().mockResolvedValue('hashed'),
}));

const mockedHash = bcrypt.hash as jest.MockedFunction<typeof bcrypt.hash>;

describe('UsersService', () => {
  const audit = { roleOrPermissionChange: jest.fn() };

  const mappedUser = {
    id: 1,
    email: 'u@test.local',
    firstName: 'a',
    lastName: 'b',
    status: UserStatus.ACTIVE,
    userRoles: [],
  };

  beforeEach(() => {
    mockedHash.mockClear();
    jest.clearAllMocks();
  });

  it('findOne throws when missing', async () => {
    const prisma: any = {
      user: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const svc = new UsersService(
      prisma,
      audit as unknown as SecurityAuditLogger,
    );
    await expect(svc.findOne(999)).rejects.toThrow(NotFoundException);
  });

  it('create logs audit', async () => {
    const prisma: any = {
      user: {
        create: jest.fn().mockResolvedValue({ id: 1, email: 'n@t.c' }),
        findUnique: jest.fn().mockResolvedValue({
          id: 1,
          email: 'n@t.c',
          firstName: 'a',
          lastName: 'b',
          status: 'ACTIVE',
          userRoles: [],
        }),
      },
      userRole: { createMany: jest.fn() },
      securityEvent: { create: jest.fn() },
    };
    const svc = new UsersService(
      prisma,
      audit as unknown as SecurityAuditLogger,
    );
    await svc.create(
      {
        email: 'n@t.c',
        password: 'password12345',
        firstName: 'a',
        lastName: 'b',
      },
      1,
    );
    expect(audit.roleOrPermissionChange).toHaveBeenCalledWith(
      'USER_CREATED',
      expect.any(Object),
    );
  });

  it('findAll maps users', async () => {
    const prisma: any = {
      user: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 1,
            email: 'a@b.c',
            firstName: 'a',
            lastName: 'b',
            status: UserStatus.ACTIVE,
            userRoles: [{ role: { name: 'user' } }],
          },
        ]),
      },
    };
    const svc = new UsersService(
      prisma,
      audit as unknown as SecurityAuditLogger,
    );
    const rows = await svc.findAll(1, 20);
    expect(rows).toHaveLength(1);
    expect(rows[0].email).toBe('a@b.c');
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 20 }),
    );
  });

  it('findOne returns mapped user', async () => {
    const prisma: any = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          ...mappedUser,
          userRoles: [{ role: { name: 'user', rolePermissions: [] } }],
        }),
      },
    };
    const svc = new UsersService(
      prisma,
      audit as unknown as SecurityAuditLogger,
    );
    const u = await svc.findOne(1);
    expect(u.id).toBe(1);
  });

  it('update writes security event and audit', async () => {
    const prisma: any = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({
            ...mappedUser,
            userRoles: [{ role: { name: 'user', rolePermissions: [] } }],
          })
          .mockResolvedValueOnce({
            ...mappedUser,
            userRoles: [{ role: { name: 'user', rolePermissions: [] } }],
          }),
        update: jest.fn(),
      },
      userRole: { deleteMany: jest.fn(), createMany: jest.fn() },
      securityEvent: { create: jest.fn() },
    };
    const svc = new UsersService(
      prisma,
      audit as unknown as SecurityAuditLogger,
    );
    await svc.update(1, { firstName: 'X' }, 9);
    expect(prisma.securityEvent.create).toHaveBeenCalled();
    expect(audit.roleOrPermissionChange).toHaveBeenCalledWith(
      'USER_UPDATED',
      expect.any(Object),
    );
  });

  it('updateStatus creates blocked event when BLOCKED', async () => {
    const prisma: any = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          ...mappedUser,
          userRoles: [],
        }),
        update: jest.fn().mockResolvedValue({
          ...mappedUser,
          status: UserStatus.BLOCKED,
        }),
      },
      securityEvent: { create: jest.fn() },
    };
    const svc = new UsersService(
      prisma,
      audit as unknown as SecurityAuditLogger,
    );
    await svc.updateStatus(1, UserStatus.BLOCKED, 2);
    expect(prisma.securityEvent.create).toHaveBeenCalled();
  });

  it('disable delegates to updateStatus', async () => {
    const prisma: any = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          ...mappedUser,
          userRoles: [],
        }),
        update: jest.fn().mockResolvedValue({
          ...mappedUser,
          status: UserStatus.DISABLED,
        }),
      },
      securityEvent: { create: jest.fn() },
    };
    const svc = new UsersService(
      prisma,
      audit as unknown as SecurityAuditLogger,
    );
    const u = await svc.disable(1, 3);
    expect(u.status).toBe(UserStatus.DISABLED);
  });

  it('assignRoles creates audit', async () => {
    const prisma: any = {
      userRole: { createMany: jest.fn() },
      securityEvent: { create: jest.fn() },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          ...mappedUser,
          userRoles: [{ role: { name: 'user', rolePermissions: [] } }],
        }),
      },
    };
    const svc = new UsersService(
      prisma,
      audit as unknown as SecurityAuditLogger,
    );
    await svc.assignRoles(1, [2], 5);
    expect(audit.roleOrPermissionChange).toHaveBeenCalledWith(
      'ROLE_ASSIGNED',
      expect.any(Object),
    );
  });

  it('removeRole deletes and audits', async () => {
    const prisma: any = {
      userRole: {
        delete: jest.fn().mockResolvedValue({}),
      },
      securityEvent: { create: jest.fn() },
    };
    const svc = new UsersService(
      prisma,
      audit as unknown as SecurityAuditLogger,
    );
    const out = await svc.removeRole(1, 2, 8);
    expect(out.success).toBe(true);
    expect(prisma.securityEvent.create).toHaveBeenCalled();
  });
});
