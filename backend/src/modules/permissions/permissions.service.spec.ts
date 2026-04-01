import { PermissionsService } from './permissions.service';

describe('PermissionsService', () => {
  it('findAll orders by code', async () => {
    const prisma: any = {
      permission: {
        findMany: jest.fn().mockResolvedValue([{ code: 'a' }]),
      },
    };
    const svc = new PermissionsService(prisma);
    await svc.findAll();
    expect(prisma.permission.findMany).toHaveBeenCalledWith({
      orderBy: { code: 'asc' },
    });
  });

  it('create, update, remove delegate to prisma', async () => {
    const prisma: any = {
      permission: {
        create: jest.fn().mockResolvedValue({ id: 1 }),
        update: jest.fn().mockResolvedValue({ id: 1, code: 'x' }),
        delete: jest.fn().mockResolvedValue({ id: 1 }),
      },
    };
    const svc = new PermissionsService(prisma);
    await svc.create({ code: 'c', name: 'N' });
    await svc.update(1, { name: 'N2' });
    await svc.remove(1);
    expect(prisma.permission.create).toHaveBeenCalled();
    expect(prisma.permission.update).toHaveBeenCalled();
    expect(prisma.permission.delete).toHaveBeenCalled();
  });
});
