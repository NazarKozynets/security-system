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

  const rbacUser = {
    id: 1,
    email: 'u@test.local',
    firstName: 'a',
    lastName: 'b',
    passwordHash: 'h',
    status: UserStatus.ACTIVE,
    failedLoginCount: 0,
    lockoutUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    userRoles: [{ role: { name: 'user', id: 1, rolePermissions: [] } }],
  };

  const mk = (o: {
    prisma?: any;
    userRepository?: any;
    userRoleRepository?: any;
    securityEventRepository?: any;
  }) =>
    new UsersService(
      o.prisma ?? {
        client: {
          $transaction: jest.fn(async (fn: any) => fn({})),
        },
      },
      o.userRepository ?? {},
      o.userRoleRepository ?? {},
      o.securityEventRepository ?? {},
      audit as unknown as SecurityAuditLogger,
    );

  beforeEach(() => {
    mockedHash.mockClear();
    jest.clearAllMocks();
  });

  it('findOne throws when missing', async () => {
    const userRepository = { findByIdWithRbac: jest.fn().mockResolvedValue(null) };
    const svc = mk({ userRepository });
    await expect(svc.findOne(999)).rejects.toThrow(NotFoundException);
  });

  it('create logs audit', async () => {
    const userRepository = {
      create: jest.fn().mockResolvedValue({ id: 1 }),
      findByIdWithRbac: jest.fn().mockResolvedValue(rbacUser),
    };
    const userRoleRepository = { insertMany: jest.fn() };
    const securityEventRepository = { create: jest.fn() };
    const svc = mk({ userRepository, userRoleRepository, securityEventRepository });
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
    const userRepository = {
      findAllPaginated: jest.fn().mockResolvedValue([
        {
          id: 1,
          email: 'a@b.c',
          firstName: 'a',
          lastName: 'b',
          status: UserStatus.ACTIVE,
          passwordHash: 'x',
          failedLoginCount: 0,
          lockoutUntil: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          userRoles: [{ role: { name: 'user', id: 1, rolePermissions: [] } }],
        },
      ]),
    };
    const svc = mk({ userRepository });
    const rows = await svc.findAll(1, 20);
    expect(rows).toHaveLength(1);
    expect(rows[0].email).toBe('a@b.c');
    expect(userRepository.findAllPaginated).toHaveBeenCalledWith(1, 20);
  });

  it('findOne returns mapped user', async () => {
    const userRepository = {
      findByIdWithRbac: jest.fn().mockResolvedValue(rbacUser),
    };
    const svc = mk({ userRepository });
    const u = await svc.findOne(1);
    expect(u.id).toBe(1);
  });

  it('update writes security event and audit', async () => {
    const userRepository = {
      findByIdWithRbac: jest
        .fn()
        .mockResolvedValueOnce(rbacUser)
        .mockResolvedValueOnce(rbacUser),
      updateFields: jest.fn(),
    };
    const userRoleRepository = {
      deleteAllForUser: jest.fn(),
      insertMany: jest.fn(),
    };
    const securityEventRepository = { create: jest.fn() };
    const svc = mk({ userRepository, userRoleRepository, securityEventRepository });
    await svc.update(1, { firstName: 'X' }, 9);
    expect(securityEventRepository.create).toHaveBeenCalled();
    expect(audit.roleOrPermissionChange).toHaveBeenCalledWith(
      'USER_UPDATED',
      expect.any(Object),
    );
  });

  it('updateStatus creates blocked event when BLOCKED', async () => {
    const userRepository = {
      findByIdWithRbac: jest.fn().mockResolvedValue(rbacUser),
      updateStatus: jest.fn().mockResolvedValue({
        id: 1,
        email: 'u@test.local',
        firstName: 'a',
        lastName: 'b',
        status: UserStatus.BLOCKED,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    };
    const securityEventRepository = { create: jest.fn() };
    const svc = mk({ userRepository, securityEventRepository });
    await svc.updateStatus(1, UserStatus.BLOCKED, 2);
    expect(securityEventRepository.create).toHaveBeenCalled();
  });

  it('disable delegates to updateStatus', async () => {
    const userRepository = {
      findByIdWithRbac: jest.fn().mockResolvedValue(rbacUser),
      updateStatus: jest.fn().mockResolvedValue({
        id: 1,
        email: 'u@test.local',
        firstName: 'a',
        lastName: 'b',
        status: UserStatus.DISABLED,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    };
    const securityEventRepository = { create: jest.fn() };
    const svc = mk({ userRepository, securityEventRepository });
    const u = await svc.disable(1, 3);
    expect(u.status).toBe(UserStatus.DISABLED);
  });

  it('assignRoles creates audit', async () => {
    const userRepository = {
      findByIdWithRbac: jest.fn().mockResolvedValue(rbacUser),
    };
    const userRoleRepository = { insertMany: jest.fn() };
    const securityEventRepository = { create: jest.fn() };
    const svc = mk({ userRepository, userRoleRepository, securityEventRepository });
    await svc.assignRoles(1, [2], 5);
    expect(audit.roleOrPermissionChange).toHaveBeenCalledWith(
      'ROLE_ASSIGNED',
      expect.any(Object),
    );
  });

  it('removeRole deletes and audits', async () => {
    const userRoleRepository = { deletePair: jest.fn() };
    const securityEventRepository = { create: jest.fn() };
    const svc = mk({ userRoleRepository, securityEventRepository });
    const out = await svc.removeRole(1, 2, 8);
    expect(out.success).toBe(true);
    expect(securityEventRepository.create).toHaveBeenCalled();
  });
});
