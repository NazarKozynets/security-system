import { SecurityAuditLogger } from '../../integrations/logger/security-audit-logger.service';
import { RolesService } from './roles.service';

describe('RolesService', () => {
  const audit = { roleOrPermissionChange: jest.fn() };

  const mk = (o: {
    roleRepository?: any;
    rolePermissionRepository?: any;
    securityEventRepository?: any;
  }) =>
    new RolesService(
      o.roleRepository ?? {},
      o.rolePermissionRepository ?? {},
      o.securityEventRepository ?? {},
      audit as unknown as SecurityAuditLogger,
    );

  it('findAll includes permissions', async () => {
    const roleRepository = {
      findAllWithPermissions: jest
        .fn()
        .mockResolvedValue([{ id: 1, name: 'admin' }]),
    };
    const svc = mk({ roleRepository });
    const rows = await svc.findAll();
    expect(rows).toHaveLength(1);
    expect(roleRepository.findAllWithPermissions).toHaveBeenCalled();
  });

  it('create and update delegate to prisma', async () => {
    const roleRepository = {
      create: jest.fn().mockResolvedValue({ id: 2 }),
      update: jest.fn().mockResolvedValue({ id: 2, name: 'x' }),
      deleteById: jest.fn(),
    };
    const svc = mk({ roleRepository });
    await svc.create({ name: 'r' });
    await svc.update(2, { name: 'x' });
    await svc.remove(2);
    expect(roleRepository.create).toHaveBeenCalled();
    expect(roleRepository.update).toHaveBeenCalled();
    expect(roleRepository.deleteById).toHaveBeenCalledWith(2);
  });

  it('removePermission deletes rolePermission row', async () => {
    const rolePermissionRepository = { deletePair: jest.fn() };
    const svc = mk({ rolePermissionRepository });
    await svc.removePermission(1, 9);
    expect(rolePermissionRepository.deletePair).toHaveBeenCalledWith(1, 9);
  });

  it('assignPermissions creates events and audit', async () => {
    const roleRepository = {
      findAllWithPermissions: jest.fn().mockResolvedValue([]),
    };
    const rolePermissionRepository = { insertMany: jest.fn() };
    const securityEventRepository = { create: jest.fn() };
    const svc = mk({
      roleRepository,
      rolePermissionRepository,
      securityEventRepository,
    });
    await svc.assignPermissions(3, [1, 2], 9);
    expect(securityEventRepository.create).toHaveBeenCalled();
    expect(audit.roleOrPermissionChange).toHaveBeenCalled();
  });
});
