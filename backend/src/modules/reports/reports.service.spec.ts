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

  it('suspiciousActivity aggregates raw queries and lists', async () => {
    const prismaMock: any = {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([{ email: 'a@b.c', failedCount: 5 }])
        .mockResolvedValueOnce([{ ipAddress: '1.1.1.1', failedCount: 6 }]),
      user: {
        findMany: jest.fn().mockResolvedValue([{ id: 1, status: 'BLOCKED' }]),
      },
      securityEvent: {
        findMany: jest.fn().mockResolvedValue([{ id: 1, severity: 'HIGH' }]),
      },
    };
    const audit = { reportGenerated: jest.fn() };
    const service = new ReportsService(prismaMock, audit as any);
    const out = await service.suspiciousActivity();
    expect(out.riskyUsers).toHaveLength(1);
    expect(out.riskyIps).toHaveLength(1);
    expect(out.blockedUsers).toHaveLength(1);
    expect(out.highSeverityEvents).toHaveLength(1);
  });

  it('securityEvents filters by date range', async () => {
    const prismaMock: any = {
      securityEvent: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const audit = { reportGenerated: jest.fn() };
    const service = new ReportsService(prismaMock, audit as any);
    await service.securityEvents({
      from: '2024-01-01',
      to: '2024-12-31',
    });
    expect(prismaMock.securityEvent.findMany).toHaveBeenCalled();
  });

  it('userAccess returns roles and permissions', async () => {
    const prismaMock: any = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 1,
          email: 'u@test.local',
          firstName: 'U',
          lastName: 'S',
          status: 'ACTIVE',
          userRoles: [
            {
              role: {
                name: 'admin',
                rolePermissions: [
                  { permission: { code: 'a.b' } },
                  { permission: { code: 'c.d' } },
                ],
              },
            },
          ],
        }),
      },
    };
    const audit = { reportGenerated: jest.fn() };
    const service = new ReportsService(prismaMock, audit as any);
    const out = await service.userAccess(1);
    expect(out?.roles).toContain('admin');
    expect(out?.permissions).toContain('a.b');
  });

  it('userAccess returns null when user missing', async () => {
    const prismaMock: any = {
      user: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const service = new ReportsService(prismaMock, { reportGenerated: jest.fn() } as any);
    await expect(service.userAccess(999)).resolves.toBeNull();
  });

  it('dashboard aggregates counts', async () => {
    const prismaMock: any = {
      user: {
        count: jest
          .fn()
          .mockResolvedValueOnce(10)
          .mockResolvedValueOnce(8)
          .mockResolvedValueOnce(1),
      },
      loginAttempt: { count: jest.fn().mockResolvedValue(2) },
      securityEvent: { count: jest.fn().mockResolvedValue(3) },
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    const service = new ReportsService(prismaMock, { reportGenerated: jest.fn() } as any);
    const d = await service.dashboard();
    expect(d.totalUsers).toBe(10);
    expect(d.activeUsers).toBe(8);
    expect(d.blockedUsers).toBe(1);
    expect(d.failedLast24h).toBe(2);
    expect(d.eventsLast7d).toBe(3);
  });

  it('securityEventsCsv produces CSV and audit', async () => {
    const prismaMock: any = {
      securityEvent: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 1,
            eventType: 'LOGIN_SUCCESS',
            severity: 'LOW',
            description: 'desc',
            userId: 1,
            createdAt: new Date('2020-01-01T00:00:00.000Z'),
          },
        ]),
        create: jest.fn(),
      },
    };
    const audit = { reportGenerated: jest.fn() };
    const service = new ReportsService(prismaMock, audit as any);
    const csv = await service.securityEventsCsv({}, 42);
    expect(csv).toContain('eventType');
    expect(csv).toContain('LOGIN_SUCCESS');
    expect(audit.reportGenerated).toHaveBeenCalled();
  });
});
