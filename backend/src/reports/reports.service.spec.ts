import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  it('builds login attempts summary counts', async () => {
    const prismaMock: any = {
      loginAttempt: {
        count: jest
          .fn()
          .mockResolvedValueOnce(10)
          .mockResolvedValueOnce(7)
          .mockResolvedValueOnce(3),
        findMany: jest.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]),
      },
    };
    const service = new ReportsService(prismaMock);

    const result = await service.loginAttempts({ success: 'false' });

    expect(result.summary).toEqual({ total: 10, failed: 7, successful: 3 });
    expect(result.rows).toHaveLength(2);
  });
});
