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
      securityEvent: { create: jest.fn() },
    };
    const audit = { reportGenerated: jest.fn() };
    const service = new ReportsService(prismaMock, audit as any);

    const result = await service.loginAttempts({ success: 'false' });

    expect(result.summary).toEqual({ total: 10, failed: 7, successful: 3 });
    expect(result.rows).toHaveLength(2);
  });

  it('loginAttemptsCsv includes header', async () => {
    const prismaMock: any = {
      loginAttempt: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 1,
            email: 'a@b.c',
            userId: 1,
            success: true,
            failureReason: null,
            ipAddress: '127.0.0.1',
            attemptedAt: new Date('2020-01-01T00:00:00.000Z'),
          },
        ]),
      },
      securityEvent: { create: jest.fn() },
    };
    const audit = { reportGenerated: jest.fn() };
    const service = new ReportsService(prismaMock, audit as any);
    const csv = await service.loginAttemptsCsv({}, 99);
    expect(csv).toContain('email');
    expect(csv).toContain('a@b.c');
    expect(prismaMock.securityEvent.create).toHaveBeenCalled();
    expect(audit.reportGenerated).toHaveBeenCalled();
  });

  it('summaryPdf returns a non-empty buffer', async () => {
    const prismaMock: any = {
      user: { count: jest.fn().mockResolvedValue(0) },
      loginAttempt: { count: jest.fn().mockResolvedValue(0) },
      securityEvent: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    const audit = { reportGenerated: jest.fn() };
    const service = new ReportsService(prismaMock, audit as any);
    const buf = await service.summaryPdf(1);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(10);
  });
});
