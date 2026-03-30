import { NotFoundException } from '@nestjs/common';
import { SecurityAuditLogger } from '../../integrations/logger/security-audit-logger.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const audit = { roleOrPermissionChange: jest.fn() };

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
});
