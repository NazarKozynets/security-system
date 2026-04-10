import { UserStatus } from '@prisma/client';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  const audit = { reportGenerated: jest.fn() };

  const mk = (overrides: {
    loginAttemptRepository?: any;
    securityEventRepository?: any;
    userRepository?: any;
    securityReportRepository?: any;
  }) =>
    new ReportsService(
      overrides.loginAttemptRepository ?? {},
      overrides.securityEventRepository ?? {},
      overrides.userRepository ?? {},
      overrides.securityReportRepository ?? {},
      audit as any,
    );

  it('builds login attempts summary counts', async () => {
    const loginAttemptRepository = {
      countForReport: jest
        .fn()
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(7)
        .mockResolvedValueOnce(3),
      findManyForReport: jest.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]),
    };
    const service = mk({ loginAttemptRepository });
    const result = await service.loginAttempts({ success: 'false' });
    expect(result.summary).toEqual({ total: 10, failed: 7, successful: 3 });
    expect(result.rows).toHaveLength(2);
  });

  it('loginAttemptsCsv includes header', async () => {
    const loginAttemptRepository = {
      findManyForCsv: jest.fn().mockResolvedValue([
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
    };
    const securityEventRepository = { create: jest.fn() };
    const service = mk({ loginAttemptRepository, securityEventRepository });
    const csv = await service.loginAttemptsCsv({}, 99);
    expect(csv).toContain('email');
    expect(csv).toContain('a@b.c');
    expect(securityEventRepository.create).toHaveBeenCalled();
    expect(audit.reportGenerated).toHaveBeenCalled();
  });

  it('summaryPdf returns a non-empty buffer', async () => {
    const userRepository = {
      countTotal: jest.fn().mockResolvedValue(0),
      countByStatus: jest.fn().mockResolvedValue(0),
    };
    const loginAttemptRepository = {
      countForReport: jest.fn().mockResolvedValue(0),
    };
    const securityEventRepository = {
      countForDashboard: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
    };
    const securityReportRepository = {
      getTopRiskyUserEmails: jest.fn().mockResolvedValue([]),
    };
    const service = mk({
      userRepository,
      loginAttemptRepository,
      securityEventRepository,
      securityReportRepository,
    });
    const buf = await service.summaryPdf(1);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(10);
  });

  it('suspiciousActivity aggregates raw queries and lists', async () => {
    const securityReportRepository = {
      getRiskyUsersByFailedCount: jest
        .fn()
        .mockResolvedValue([{ email: 'a@b.c', failedCount: 5 }]),
      getRiskyIpsByFailedCount: jest
        .fn()
        .mockResolvedValue([{ ipAddress: '1.1.1.1', failedCount: 6 }]),
    };
    const userRepository = {
      findManyByStatusPublicFields: jest
        .fn()
        .mockResolvedValue([{ id: 1, status: UserStatus.BLOCKED }]),
    };
    const securityEventRepository = {
      findHighSeverityRecent: jest
        .fn()
        .mockResolvedValue([{ id: 1, severity: 'HIGH' }]),
    };
    const service = mk({
      securityReportRepository,
      userRepository,
      securityEventRepository,
    });
    const out = await service.suspiciousActivity();
    expect(out.riskyUsers).toHaveLength(1);
    expect(out.riskyIps).toHaveLength(1);
    expect(out.blockedUsers).toHaveLength(1);
    expect(out.highSeverityEvents).toHaveLength(1);
  });

  it('securityEvents filters by date range', async () => {
    const securityEventRepository = {
      findManyForReport: jest.fn().mockResolvedValue([]),
    };
    const service = mk({ securityEventRepository });
    await service.securityEvents({
      from: '2024-01-01',
      to: '2024-12-31',
    });
    expect(securityEventRepository.findManyForReport).toHaveBeenCalled();
  });

  it('userAccess returns roles and permissions', async () => {
    const userRepository = {
      findByIdWithRbac: jest.fn().mockResolvedValue({
        id: 1,
        email: 'u@test.local',
        firstName: 'U',
        lastName: 'S',
        status: UserStatus.ACTIVE,
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
    };
    const service = mk({ userRepository });
    const out = await service.userAccess(1);
    expect(out?.roles).toContain('admin');
    expect(out?.permissions).toContain('a.b');
  });

  it('userAccess returns null when user missing', async () => {
    const userRepository = {
      findByIdWithRbac: jest.fn().mockResolvedValue(null),
    };
    const service = mk({ userRepository });
    await expect(service.userAccess(999)).resolves.toBeNull();
  });

  it('dashboard aggregates counts', async () => {
    const userRepository = {
      countTotal: jest.fn().mockResolvedValue(10),
      countByStatus: jest
        .fn()
        .mockResolvedValueOnce(8)
        .mockResolvedValueOnce(1),
    };
    const loginAttemptRepository = {
      countForReport: jest.fn().mockResolvedValue(2),
    };
    const securityEventRepository = {
      countForDashboard: jest.fn().mockResolvedValue(3),
    };
    const securityReportRepository = {
      getTopRiskyUserEmails: jest.fn().mockResolvedValue([]),
    };
    const service = mk({
      userRepository,
      loginAttemptRepository,
      securityEventRepository,
      securityReportRepository,
    });
    const d = await service.dashboard();
    expect(d.totalUsers).toBe(10);
    expect(d.activeUsers).toBe(8);
    expect(d.blockedUsers).toBe(1);
    expect(d.failedLast24h).toBe(2);
    expect(d.eventsLast7d).toBe(3);
  });

  it('securityEventsCsv produces CSV and audit', async () => {
    const securityEventRepository = {
      findManyForCsv: jest.fn().mockResolvedValue([
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
    };
    const service = mk({ securityEventRepository });
    const csv = await service.securityEventsCsv({}, 42);
    expect(csv).toContain('eventType');
    expect(csv).toContain('LOGIN_SUCCESS');
    expect(audit.reportGenerated).toHaveBeenCalled();
  });
});
