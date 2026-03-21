import { Injectable } from '@nestjs/common';
import { Severity } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async loginAttempts(params: { from?: string; to?: string; userId?: number; success?: string }) {
    const where = {
      userId: params.userId,
      success: params.success !== undefined ? params.success === 'true' : undefined,
      attemptedAt: {
        gte: params.from ? new Date(params.from) : undefined,
        lte: params.to ? new Date(params.to) : undefined,
      },
    };
    const [total, failed, successful, rows] = await Promise.all([
      this.prisma.loginAttempt.count({ where }),
      this.prisma.loginAttempt.count({ where: { ...where, success: false } }),
      this.prisma.loginAttempt.count({ where: { ...where, success: true } }),
      this.prisma.loginAttempt.findMany({ where, orderBy: { attemptedAt: 'desc' }, take: 100 }),
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
    const blockedUsers = await this.prisma.user.findMany({ where: { status: 'BLOCKED' }, take: 10 });
    const highSeverityEvents = await this.prisma.securityEvent.findMany({
      where: { severity: { in: [Severity.HIGH, Severity.CRITICAL] } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { riskyUsers, riskyIps, blockedUsers, highSeverityEvents };
  }

  securityEvents(params: { from?: string; to?: string; eventType?: any; severity?: any }) {
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
            role: { include: { rolePermissions: { include: { permission: true } } } },
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
    const [totalUsers, activeUsers, blockedUsers, failedLast24h, eventsLast7d, topRiskyUsers] =
      await Promise.all([
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
          where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
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
    return { totalUsers, activeUsers, blockedUsers, failedLast24h, eventsLast7d, topRiskyUsers };
  }
}
