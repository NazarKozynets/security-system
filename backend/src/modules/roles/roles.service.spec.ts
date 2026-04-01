import { SecurityAuditLogger } from '../../integrations/logger/security-audit-logger.service';
import { RolesService } from './roles.service';

describe('RolesService', () => {
  it('findAll includes permissions', async () => {
    const prisma: any = {
      role: {
        findMany: jest.fn().mockResolvedValue([{ id: 1, name: 'admin' }]),
      },
    };
    const audit = { roleOrPermissionChange: jest.fn() };
    const svc = new RolesService(
      prisma,
      audit as unknown as SecurityAuditLogger,
    );
    const rows = await svc.findAll();
    expect(rows).toHaveLength(1);
    expect(prisma.role.findMany).toHaveBeenCalled();
  });

  it('create and update delegate to prisma', async () => {
    const prisma: any = {
      role: {
        create: jest.fn().mockResolvedValue({ id: 2 }),
        update: jest.fn().mockResolvedValue({ id: 2, name: 'x' }),
        delete: jest.fn().mockResolvedValue({ id: 2 }),
      },
    };
    const audit = { roleOrPermissionChange: jest.fn() };
    const svc = new RolesService(
      prisma,
      audit as unknown as SecurityAuditLogger,
    );
    await svc.create({ name: 'r' });
    await svc.update(2, { name: 'x' });
    await svc.remove(2);
    expect(prisma.role.create).toHaveBeenCalled();
    expect(prisma.role.update).toHaveBeenCalled();
    expect(prisma.role.delete).toHaveBeenCalled();
  });

  it('removePermission deletes rolePermission row', async () => {
    const prisma: any = {
      rolePermission: {
        delete: jest.fn().mockResolvedValue({}),
      },
    };
    const audit = { roleOrPermissionChange: jest.fn() };
    const svc = new RolesService(
      prisma,
      audit as unknown as SecurityAuditLogger,
    );
    await svc.removePermission(1, 9);
    expect(prisma.rolePermission.delete).toHaveBeenCalledWith({
      where: { roleId_permissionId: { roleId: 1, permissionId: 9 } },
    });
  });

  it('assignPermissions creates events and audit', async () => {
    const prisma: any = {
      rolePermission: { createMany: jest.fn() },
      securityEvent: { create: jest.fn() },
      role: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const audit = { roleOrPermissionChange: jest.fn() };
    const svc = new RolesService(
      prisma,
      audit as unknown as SecurityAuditLogger,
    );
    await svc.assignPermissions(3, [1, 2], 9);
    expect(prisma.securityEvent.create).toHaveBeenCalled();
    expect(audit.roleOrPermissionChange).toHaveBeenCalled();
  });
});
