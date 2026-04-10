import { PermissionsService } from './permissions.service';

describe('PermissionsService', () => {
  it('findAll orders by code', async () => {
    const permissionRepository = {
      findAllOrdered: jest.fn().mockResolvedValue([{ id: 1, code: 'a' }]),
    };
    const svc = new PermissionsService(permissionRepository as any);
    const rows = await svc.findAll();
    expect(rows).toHaveLength(1);
    expect(permissionRepository.findAllOrdered).toHaveBeenCalled();
  });

  it('create, update, remove delegate to prisma', async () => {
    const permissionRepository = {
      create: jest.fn().mockResolvedValue({ id: 2 }),
      update: jest.fn().mockResolvedValue({ id: 2, code: 'x' }),
      deleteById: jest.fn(),
    };
    const svc = new PermissionsService(permissionRepository as any);
    await svc.create({ code: 'c', name: 'n' });
    await svc.update(2, { code: 'x' });
    await svc.remove(2);
    expect(permissionRepository.create).toHaveBeenCalled();
    expect(permissionRepository.update).toHaveBeenCalled();
    expect(permissionRepository.deleteById).toHaveBeenCalledWith(2);
  });
});
