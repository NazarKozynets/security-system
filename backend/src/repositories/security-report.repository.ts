import {Injectable} from '@nestjs/common';
import {PrismaService} from '../database/prisma/prisma.service';

// Interface for repository for SecurityReport model
interface ISecurityReportRepository {
    // Get risky emails by failed count
    // - Considers failed login attempts within the last 14 days
    // - Returns only users with at least 5 failed attempts (HAVING COUNT >= 5)
    // - Returns up to 15 users
    // - Used to identify truly suspicious users based on a threshold
    getRiskyUsersByFailedCount(): Promise<{ email: string; failedCount: number }[]>;

    // Get risky ips by failed count
    getRiskyIpsByFailedCount(): Promise<{ ipAddress: string; failedCount: number }[]>;

    // Get top risky user emails
    // - Considers failed login attempts within the last 7 days
    // - Does NOT enforce a minimum threshold (no HAVING clause)
    // - Simply returns top users sorted by failed attempts
    // - Returns up to 5 users
    // - Used to get a quick "top list", even if counts are low
    getTopRiskyUserEmails(): Promise<{ email: string; failedCount: number }[]>;
}

@Injectable()
export class SecurityReportRepository implements ISecurityReportRepository {
    constructor(private readonly prisma: PrismaService) {
    }

    // Get risky emails by failed count
    async getRiskyUsersByFailedCount(): Promise<{ email: string; failedCount: number }[]> {
        return this.prisma.client.$queryRaw<{ email: string; failedCount: number }[]>`
            SELECT la.email, COUNT(*)::int AS "failedCount"
            FROM "LoginAttempt" la
            WHERE la.success = false
              AND la."attemptedAt" >= NOW() - INTERVAL '14 days'
            GROUP BY la.email
            HAVING COUNT(*) >= 5
            ORDER BY "failedCount" DESC
            LIMIT 15
        `;
    }

    // Get risky ips by failed count
    async getRiskyIpsByFailedCount(): Promise<{ ipAddress: string; failedCount: number }[]> {
        return this.prisma.client.$queryRaw<{ ipAddress: string; failedCount: number }[]>`
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
    }

    // Get top risky user emails
    async getTopRiskyUserEmails(): Promise<{ email: string; failedCount: number }[]> {
        return this.prisma.client.$queryRaw<{ email: string; failedCount: number }[]>`
            SELECT la.email, COUNT(*)::int AS "failedCount"
            FROM "LoginAttempt" la
            WHERE la.success = false
              AND la."attemptedAt" >= NOW() - INTERVAL '7 days'
            GROUP BY la.email
            ORDER BY "failedCount" DESC
            LIMIT 5
        `;
    }
}
