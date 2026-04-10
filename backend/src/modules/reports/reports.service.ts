import { Injectable } from '@nestjs/common';
import { EventType, Severity, UserStatus } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { toCsvRow } from '../../integrations/export/csv-export.util';
import { SecurityAuditLogger } from '../../integrations/logger/security-audit-logger.service';
import { LoginAttemptRepository } from '../../repositories/login-attempt.repository';
import { SecurityEventRepository } from '../../repositories/security-event.repository';
import { SecurityReportRepository } from '../../repositories/security-report.repository';
import { UserRepository } from '../../repositories/user.repository';

@Injectable()
export class ReportsService {
  constructor(
    private readonly loginAttemptRepository: LoginAttemptRepository,
    private readonly securityEventRepository: SecurityEventRepository,
    private readonly userRepository: UserRepository,
    private readonly securityReportRepository: SecurityReportRepository,
    private readonly audit: SecurityAuditLogger,
  ) {}

  async loginAttempts(params: {
    from?: string;
    to?: string;
    userId?: number;
    success?: string;
  }) {
    const from = params.from ? new Date(params.from) : undefined;
    const to = params.to ? new Date(params.to) : undefined;
    const userId = params.userId;
    const success =
      params.success !== undefined ? params.success === 'true' : undefined;

    const base = { userId, from, to };
    const [total, failed, successful, rows] = await Promise.all([
      this.loginAttemptRepository.countForReport(base),
      this.loginAttemptRepository.countForReport({
        ...base,
        success: false,
      }),
      this.loginAttemptRepository.countForReport({
        ...base,
        success: true,
      }),
      this.loginAttemptRepository.findManyForReport({
        ...base,
        success,
        take: 100,
      }),
    ]);
    return { summary: { total, failed, successful }, rows };
  }

  async suspiciousActivity() {
    const [riskyUsers, riskyIps, blockedUsers, highSeverityEvents] =
      await Promise.all([
        this.securityReportRepository.getRiskyUsersByFailedCount(),
        this.securityReportRepository.getRiskyIpsByFailedCount(),
        this.userRepository.findManyByStatusPublicFields(UserStatus.BLOCKED, 10),
        this.securityEventRepository.findHighSeverityRecent(
          [Severity.HIGH, Severity.CRITICAL],
          50,
        ),
      ]);
    return { riskyUsers, riskyIps, blockedUsers, highSeverityEvents };
  }

  securityEvents(params: {
    from?: string;
    to?: string;
    eventType?: any;
    severity?: any;
  }) {
    return this.securityEventRepository.findManyForReport({
      eventType: params.eventType,
      severity: params.severity,
      from: params.from ? new Date(params.from) : undefined,
      to: params.to ? new Date(params.to) : undefined,
      take: 200,
    });
  }

  async userAccess(userId: number) {
    const user = await this.userRepository.findByIdWithRbac(userId);
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
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [
      totalUsers,
      activeUsers,
      blockedUsers,
      failedLast24h,
      eventsLast7d,
      topRiskyUsers,
    ] = await Promise.all([
      this.userRepository.countTotal(),
      this.userRepository.countByStatus(UserStatus.ACTIVE),
      this.userRepository.countByStatus(UserStatus.BLOCKED),
      this.loginAttemptRepository.countForReport({
        success: false,
        from: dayAgo,
      }),
      this.securityEventRepository.countForDashboard(weekAgo),
      this.securityReportRepository.getTopRiskyUserEmails(),
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
    const from = params.from ? new Date(params.from) : undefined;
    const to = params.to ? new Date(params.to) : undefined;
    const userId = params.userId;
    const success =
      params.success !== undefined ? params.success === 'true' : undefined;
    const rows = await this.loginAttemptRepository.findManyForCsv({
      userId,
      success,
      from,
      to,
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
    const rows = await this.securityEventRepository.findManyForCsv({
      eventType: params.eventType,
      severity: params.severity,
      from: params.from ? new Date(params.from) : undefined,
      to: params.to ? new Date(params.to) : undefined,
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
      await this.securityEventRepository.create({
        userId: actorId,
        eventType: EventType.REPORT_GENERATED,
        severity: Severity.LOW,
        entityType: 'Report',
        entityId: reportType,
        description: `Report export: ${reportType}`,
      });
    }
    this.audit.reportGenerated({ userId: actorId, reportType });
  }
}
