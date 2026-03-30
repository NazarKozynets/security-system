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
});
