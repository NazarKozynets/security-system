import { SecurityAuditLogger } from '../../integrations/logger/security-audit-logger.service';
import { RolesService } from './roles.service';

describe('RolesService', () => {
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
