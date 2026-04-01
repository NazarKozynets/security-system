import { LoginAttemptsService } from './login-attempts.service';

describe('LoginAttemptsService', () => {
  it('findAll paginates', async () => {
    const prisma: any = {
      loginAttempt: {
        findMany: jest.fn().mockResolvedValue([{ id: 1 }]),
      },
    };
    const svc = new LoginAttemptsService(prisma);
    const rows = await svc.findAll(2, 10);
    expect(rows).toHaveLength(1);
    expect(prisma.loginAttempt.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 }),
    );
  });

  it('findOne returns single row', async () => {
    const prisma: any = {
      loginAttempt: {
        findUnique: jest.fn().mockResolvedValue({ id: 5, email: 'a@b.c' }),
      },
    };
    const svc = new LoginAttemptsService(prisma);
    const row = await svc.findOne(5);
    expect(row?.id).toBe(5);
    expect(prisma.loginAttempt.findUnique).toHaveBeenCalledWith({
      where: { id: 5 },
    });
  });
});
