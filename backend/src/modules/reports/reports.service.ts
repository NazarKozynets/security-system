import {Injectable} from '@nestjs/common';
import {EventType, Severity, UserStatus} from '@prisma/client';
import PDFDocument from 'pdfkit';
import {toCsvRow} from '../../integrations/export/csv-export.util';
import {SecurityAuditLogger} from '../../integrations/logger/security-audit-logger.service';
import {LoginAttemptRepository, LoginAttemptRow} from '../../repositories/login-attempt.repository';
import {SecurityEventRepository} from '../../repositories/security-event.repository';
import {SecurityReportRepository} from '../../repositories/security-report.repository';
import {UserRepository} from '../../repositories/user.repository';

// Interface for ReportsService
interface IReportsService {
    // Get list of login attempts
    loginAttempts(params: {
        from?: string;
        to?: string;
        userId?: number;
        success?: string;
    }): Promise<{ summary: { total: number; failed: number; successful: number }; rows: LoginAttemptRow[] }>;

    // Find filtered by date security events
    securityEvents(params: {
        from?: string;
        to?: string;
        eventType?: any;
        severity?: any;
    }): Promise<any>; // todo: create dto, instead of using 'any' type

    // Get specific user's information (with RBAC)
    userAccess(userId: number): Promise<any>; // todo: create dto, instead of using 'any' type

    // Get information for dashboard page
    dashboard(): Promise<any>; // todo: create dto, instead of using 'any' type
}

@Injectable()
export class ReportsService implements IReportsService {
    constructor(
        private readonly loginAttemptRepository: LoginAttemptRepository,
        private readonly securityEventRepository: SecurityEventRepository,
        private readonly userRepository: UserRepository,
        private readonly securityReportRepository: SecurityReportRepository,
        private readonly audit: SecurityAuditLogger,
    ) {
    }

    // Get list of login attempts
    async loginAttempts(params: {
        from?: string;
        to?: string;
        userId?: number;
        success?: string;
    }): Promise<{ summary: { total: number; failed: number; successful: number }; rows: LoginAttemptRow[] }> {
        // Normalize params
        const from = params.from ? new Date(params.from) : undefined;
        const to = params.to ? new Date(params.to) : undefined;
        const userId = params.userId;
        const success = params.success !== undefined ? params.success === 'true' : undefined;

        const base = {userId, from, to};

        // Promise with all queries
        const [total, failed, successful, rows] = await Promise.all([
            // Query for getting count of ALL login attempts
            this.loginAttemptRepository.countForReport(base),

            // Query for getting count of UNSUCCESSFUL login attempts
            this.loginAttemptRepository.countForReport({
                ...base,
                success: false,
            }),

            // Query for getting count of SUCCESSFUL login attempts
            this.loginAttemptRepository.countForReport({
                ...base,
                success: true,
            }),

            // Query for getting LoginAttemptRow[] of logging attempts
            this.loginAttemptRepository.findManyForReport({
                ...base,
                success,
                take: 100,
            }),
        ]);

        return {summary: {total, failed, successful}, rows};
    }

    // Get list of suspicious activity
    async suspiciousActivity() {
        const [riskyUsers, riskyIps, blockedUsers, highSeverityEvents] =
            // Promise with all queries
            await Promise.all([
                // Query for getting count of risky users
                this.securityReportRepository.getRiskyUsersByFailedCount(),

                // Query for getting count of risky ips
                this.securityReportRepository.getRiskyIpsByFailedCount(),

                // Query for getting blocked users
                this.userRepository.findManyByStatusPublicFields(UserStatus.BLOCKED, 10),

                // Query for getting recent HIGH/CRITICAL severity
                this.securityEventRepository.findHighSeverityRecent(
                    [Severity.HIGH, Severity.CRITICAL],
                    50,
                ),
            ]);

        return {riskyUsers, riskyIps, blockedUsers, highSeverityEvents};
    }

    // Find filtered by date security events
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

    // Get specific user's information (with RBAC)
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

    // Get information for dashboard page
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
        ] = await Promise.all([ // Promise with all queries
            // Query for getting count of all users
            this.userRepository.countTotal(),

            // Getting number of 'ACTIVE' users
            this.userRepository.countByStatus(UserStatus.ACTIVE),

            // Getting number of 'BLOCKED' users
            this.userRepository.countByStatus(UserStatus.BLOCKED),

            // Query for getting count of all login attempts
            this.loginAttemptRepository.countForReport({
                success: false,
                from: dayAgo,
            }),

            // Query for getting count of security events since last week
            this.securityEventRepository.countForDashboard(weekAgo),

            // Query for getting top risky emails
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

    // Returns string with specified login attempts (for creating .csv)
    async loginAttemptsCsv(
        params: { from?: string; to?: string; userId?: number; success?: string },
        actorId?: number,
    ): Promise<string> {
        // Normalizing params
        const from = params.from ? new Date(params.from) : undefined;
        const to = params.to ? new Date(params.to) : undefined;
        const userId = params.userId;
        const success =  params.success !== undefined ? params.success === 'true' : undefined;

        // Getting login attempts
        const rows = await this.loginAttemptRepository.findManyForCsv({
            userId,
            success,
            from,
            to,
        });

        // Creating new security event about generating new report
        await this.recordReportGenerated(actorId, 'login_attempts_csv');

        // Table headers
        // todo: don't create this array each time when method runs. Need to create it in class as private readonly field
        const header = [
            'id',
            'email',
            'userId',
            'success',
            'failureReason',
            'ipAddress',
            'attemptedAt',
        ];

        // Finalizing CSV string
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

    // Returns string[] with specified security events (for creating .csv)
    async securityEventsCsv(
        params: {
            from?: string;
            to?: string;
            eventType?: string;
            severity?: string;
        },
        actorId?: number,
    ): Promise<string> {
        // Getting security events
        const rows = await this.securityEventRepository.findManyForCsv({
            eventType: params.eventType,
            severity: params.severity,
            from: params.from ? new Date(params.from) : undefined,
            to: params.to ? new Date(params.to) : undefined,
        });

        // Creating new security event about generating new report
        await this.recordReportGenerated(actorId, 'security_events_csv');

        // Table headers
        // todo: don't create this array each time when method runs. Need to create it in class as private readonly field
        const header = [
            'id',
            'eventType',
            'severity',
            'description',
            'userId',
            'createdAt',
        ];

        // Finalizing CSV string
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

    // Creates summary .pdf file with information for dashboard
    async summaryPdf(actorId?: number): Promise<Buffer> {
        // Getting dashboard information
        const dash = await this.dashboard();

        // Creating new security event about generating new report
        await this.recordReportGenerated(actorId, 'summary_pdf');

        // Creating file
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({margin: 50});
            const chunks: Buffer[] = [];
            doc.on('data', (c) => chunks.push(c as Buffer));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
            doc.fontSize(18).text('Security dashboard summary', {underline: true});
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

    // Creates new security event about generating report
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
        this.audit.reportGenerated({userId: actorId, reportType});
    }
}
