import { Injectable } from '@nestjs/common';
import { EventType, Severity } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { toCsvRow } from '../../integrations/export/csv-export.util';
import { SecurityAuditLogger } from '../../integrations/logger/security-audit-logger.service';
import { PrismaService } from '../../database/prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: SecurityAuditLogger,
  ) {}

  async loginAttempts(params: {
    from?: string;
    to?: string;
    userId?: number;
    success?: string;
  }) {
    const where = {
      userId: params.userId,
      success:
        params.success !== undefined ? params.success === 'true' : undefined,
      attemptedAt: {
        gte: params.from ? new Date(params.from) : undefined,
        lte: params.to ? new Date(params.to) : undefined,
      },
    };
    const [total, failed, successful, rows] = await Promise.all([
      this.prisma.loginAttempt.count({ where }),
      this.prisma.loginAttempt.count({ where: { ...where, success: false } }),
      this.prisma.loginAttempt.count({ where: { ...where, success: true } }),
      this.prisma.loginAttempt.findMany({
        where,
        orderBy: { attemptedAt: 'desc' },
        take: 100,
      }),
    ]);
    return { summary: { total, failed, successful }, rows };
  }

  async suspiciousActivity() {
    const riskyUsers = await this.prisma.$queryRaw`
      SELECT la.email, COUNT(*)::int AS "failedCount"
      FROM "LoginAttempt" la
      WHERE la.success = false AND la."attemptedAt" >= NOW() - INTERVAL '7 days'
      GROUP BY la.email
      HAVING COUNT(*) >= 3
      ORDER BY "failedCount" DESC
      LIMIT 10
    `;
    const riskyIps = await this.prisma.$queryRaw`
      SELECT la."ipAddress", COUNT(*)::int AS "failedCount"
      FROM "LoginAttempt" la
      WHERE la.success = false
        AND la."attemptedAt" >= NOW() - INTERVAL '7 days'
        AND la."ipAddress" IS NOT NULL
      GROUP BY la."ipAddress"
      HAVING COUNT(*) >= 5
      ORDER BY "failedCount" DESC
      LIMIT 10
    `;
    const blockedUsers = await this.prisma.user.findMany({
      where: { status: 'BLOCKED' },
      take: 10,
    });
    const highSeverityEvents = await this.prisma.securityEvent.findMany({
      where: { severity: { in: [Severity.HIGH, Severity.CRITICAL] } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { riskyUsers, riskyIps, blockedUsers, highSeverityEvents };
  }

  securityEvents(params: {
    from?: string;
    to?: string;
    eventType?: any;
    severity?: any;
  }) {
    return this.prisma.securityEvent.findMany({
      where: {
        eventType: params.eventType,
        severity: params.severity,
        createdAt: {
          gte: params.from ? new Date(params.from) : undefined,
          lte: params.to ? new Date(params.to) : undefined,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async userAccess(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: { rolePermissions: { include: { permission: true } } },
            },
          },
        },
      },
    });
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      roles: user.userRoles.map((x) => x.role.name),
      permissions: [
        ...new Set(
          user.userRoles.flatMap((x) =>
            x.role.rolePermissions.map((rp) => rp.permission.code),
          ),
        ),
      ],
    };
  }

  async dashboard() {
    const [
      totalUsers,
      activeUsers,
      blockedUsers,
      failedLast24h,
      eventsLast7d,
      topRiskyUsers,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: 'ACTIVE' } }),
      this.prisma.user.count({ where: { status: 'BLOCKED' } }),
      this.prisma.loginAttempt.count({
        where: {
          success: false,
          attemptedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.securityEvent.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.$queryRaw`
          SELECT la.email, COUNT(*)::int as "failedCount"
          FROM "LoginAttempt" la
          WHERE la.success = false AND la."attemptedAt" >= NOW() - INTERVAL '7 days'
          GROUP BY la.email
          ORDER BY "failedCount" DESC
          LIMIT 5
        `,
    ]);
    return {
      totalUsers,
      activeUsers,
      blockedUsers,
      failedLast24h,
      eventsLast7d,
      topRiskyUsers,
    };
  }

  async loginAttemptsCsv(
    params: { from?: string; to?: string; userId?: number; success?: string },
    actorId?: number,
  ) {
    const where = {
      userId: params.userId,
      success:
        params.success !== undefined ? params.success === 'true' : undefined,
      attemptedAt: {
        gte: params.from ? new Date(params.from) : undefined,
        lte: params.to ? new Date(params.to) : undefined,
      },
    };
    const rows = await this.prisma.loginAttempt.findMany({
      where,
      orderBy: { attemptedAt: 'desc' },
      take: 5000,
    });
    await this.recordReportGenerated(actorId, 'login_attempts_csv');
    const header = [
      'id',
      'email',
      'userId',
      'success',
      'failureReason',
      'ipAddress',
      'attemptedAt',
    ];
    const body = rows.map((r) =>
      toCsvRow([
        r.id,
        r.email,
        r.userId ?? '',
        r.success,
        r.failureReason ?? '',
        r.ipAddress ?? '',
        r.attemptedAt.toISOString(),
      ]),
    );
    return [toCsvRow(header), ...body].join('\r\n') + '\r\n';
  }

  async securityEventsCsv(
    params: {
      from?: string;
      to?: string;
      eventType?: string;
      severity?: string;
    },
    actorId?: number,
  ) {
    const rows = await this.prisma.securityEvent.findMany({
      where: {
        eventType: params.eventType as any,
        severity: params.severity as any,
        createdAt: {
          gte: params.from ? new Date(params.from) : undefined,
          lte: params.to ? new Date(params.to) : undefined,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });
    await this.recordReportGenerated(actorId, 'security_events_csv');
    const header = [
      'id',
      'eventType',
      'severity',
      'description',
      'userId',
      'createdAt',
    ];
    const lines = [
      toCsvRow(header),
      ...rows.map((r) =>
        toCsvRow([
          r.id,
          r.eventType,
          r.severity,
          r.description,
          r.userId ?? '',
          r.createdAt.toISOString(),
        ]),
      ),
    ];
    return lines.join('\r\n') + '\r\n';
  }

  async summaryPdf(actorId?: number): Promise<Buffer> {
    const dash = await this.dashboard();
    await this.recordReportGenerated(actorId, 'summary_pdf');
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c as Buffer));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.fontSize(18).text('Security dashboard summary', { underline: true });
      doc.moveDown();
      doc.fontSize(11);
      doc.text(`Total users: ${dash.totalUsers}`);
      doc.text(`Active users: ${dash.activeUsers}`);
      doc.text(`Blocked users: ${dash.blockedUsers}`);
      doc.text(`Failed logins (24h): ${dash.failedLast24h}`);
      doc.text(`Security events (7d): ${dash.eventsLast7d}`);
      doc.end();
    });
  }

  private async recordReportGenerated(
    actorId: number | undefined,
    reportType: string,
  ) {
    if (actorId) {
      await this.prisma.securityEvent.create({
        data: {
          userId: actorId,
          eventType: EventType.REPORT_GENERATED,
          severity: Severity.LOW,
          entityType: 'Report',
          entityId: reportType,
          description: `Report export: ${reportType}`,
        },
      });
    }
    this.audit.reportGenerated({ userId: actorId, reportType });
  }
}
