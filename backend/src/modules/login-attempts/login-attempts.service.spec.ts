import { LoginAttemptsService } from './login-attempts.service';

describe('LoginAttemptsService', () => {
  it('findAll paginates', async () => {
    const loginAttemptRepository = {
      findManyPaginated: jest.fn().mockResolvedValue([{ id: 1 }]),
    };
    const svc = new LoginAttemptsService(loginAttemptRepository as any);
    const rows = await svc.findAll(2, 5);
    expect(rows).toHaveLength(1);
    expect(loginAttemptRepository.findManyPaginated).toHaveBeenCalledWith(2, 5);
  });

  it('findOne returns single row', async () => {
    const loginAttemptRepository = {
      findById: jest.fn().mockResolvedValue({ id: 9 }),
    };
    const svc = new LoginAttemptsService(loginAttemptRepository as any);
    const row = await svc.findOne(9);
    expect(row?.id).toBe(9);
  });
});
