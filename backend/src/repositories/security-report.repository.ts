import { Injectable } from '@nestjs/common';
import { Prisma, Severity, UserStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma/prisma.service';

/**
 * Analytical SQL for security coursework: each public method demonstrates one required pattern.
 * Used by ReportsService (dashboard / suspicious activity) so queries stay exercised.
 */
@Injectable()
export class SecurityReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Query type 1: Simple SELECT query
  async queryType01_simpleSelectActiveUserEmails(): Promise<{ email: string }[]> {
    return this.prisma.client.$queryRaw<{ email: string }[]>`
      SELECT email FROM "User" WHERE status = 'ACTIVE'::"UserStatus" ORDER BY email ASC LIMIT 50
    `;
  }

  // Query type 2: SELECT with BETWEEN ... AND
  async queryType02_usersCreatedBetween(
    start: Date,
    end: Date,
  ): Promise<{ id: number; email: string; createdAt: Date }[]> {
    return this.prisma.client.$queryRaw<
      { id: number; email: string; createdAt: Date }[]
    >`
      SELECT id, email, "createdAt"
      FROM "User"
      WHERE "createdAt" BETWEEN ${start} AND ${end}
      ORDER BY "createdAt" DESC
      LIMIT 100
    `;
  }

  // Query type 3: SELECT with IN
  async queryType03_usersWithStatuses(
    statuses: UserStatus[],
  ): Promise<{ id: number; status: UserStatus }[]> {
    if (!statuses.length) return [];
    const list = statuses.map((s) => Prisma.sql`${s}::"UserStatus"`);
    return this.prisma.client.$queryRaw<{ id: number; status: UserStatus }[]>`
      SELECT id, status
      FROM "User"
      WHERE status IN (${Prisma.join(list)})
      ORDER BY id ASC
      LIMIT 200
    `;
  }

  // Query type 4: SELECT with LIKE
  async queryType04_usersEmailLike(pattern: string): Promise<{ id: number; email: string }[]> {
    return this.prisma.client.$queryRaw<{ id: number; email: string }[]>`
      SELECT id, email
      FROM "User"
      WHERE email LIKE ${pattern}
      ORDER BY email ASC
      LIMIT 100
    `;
  }

  // Query type 5: SELECT with two conditions using AND
  async queryType05_failedLoginsForEmailAndIp(
    email: string,
    ip: string,
  ): Promise<{ id: number }[]> {
    return this.prisma.client.$queryRaw<{ id: number }[]>`
      SELECT id
      FROM "LoginAttempt"
      WHERE email = ${email} AND "ipAddress" = ${ip}
      ORDER BY "attemptedAt" DESC
      LIMIT 50
    `;
  }

  // Query type 6: SELECT with two conditions using OR
  async queryType06_securityEventsMediumOrCritical(): Promise<
    { id: number; severity: Severity }[]
  > {
    return this.prisma.client.$queryRaw<{ id: number; severity: Severity }[]>`
      SELECT id, severity
      FROM "SecurityEvent"
      WHERE severity = 'MEDIUM'::"Severity" OR severity = 'CRITICAL'::"Severity"
      ORDER BY "createdAt" DESC
      LIMIT 100
    `;
  }

  // Query type 7: SELECT with DISTINCT
  async queryType07_distinctLoginSourceIps(): Promise<{ ipAddress: string }[]> {
    return this.prisma.client.$queryRaw<{ ipAddress: string }[]>`
      SELECT DISTINCT "ipAddress"
      FROM "LoginAttempt"
      WHERE "ipAddress" IS NOT NULL
      ORDER BY "ipAddress" ASC
      LIMIT 200
    `;
  }

  // Query type 8: Query with MIN or MAX
  async queryType08_maxFailedAttemptsForEmail(): Promise<{ maxFailed: number | null }[]> {
    return this.prisma.client.$queryRaw<{ maxFailed: number | null }[]>`
      SELECT MAX("failedLoginCount")::int AS "maxFailed"
      FROM "User"
    `;
  }

  // Query type 9: Query with SUM or AVG
  async queryType09_avgFailedLoginsPerDistinctEmail(): Promise<{ avgFailed: number | null }[]> {
    return this.prisma.client.$queryRaw<{ avgFailed: number | null }[]>`
      SELECT AVG("failedLoginCount")::float AS "avgFailed"
      FROM "User"
      WHERE status = 'ACTIVE'::"UserStatus"
    `;
  }

  // Query type 10: Query with COUNT
  async queryType10_countAllLoginAttempts(): Promise<{ total: number }[]> {
    return this.prisma.client.$queryRaw<{ total: number }[]>`
      SELECT COUNT(*)::int AS total FROM "LoginAttempt"
    `;
  }

  // Query type 11: Query with aggregate function plus additional selected fields
  async queryType11_failedAttemptsPerEmailWithEmail(): Promise<
    { email: string; failedCount: number }[]
  > {
    return this.prisma.client.$queryRaw<{ email: string; failedCount: number }[]>`
      SELECT la.email, COUNT(*)::int AS "failedCount"
      FROM "LoginAttempt" la
      WHERE la.success = false AND la."attemptedAt" >= NOW() - INTERVAL '30 days'
      GROUP BY la.email
      ORDER BY "failedCount" DESC
      LIMIT 20
    `;
  }

  // Query type 12: Query with aggregate function and a condition on a regular field
  async queryType12_avgFailureReasonLengthWhereNotNull(): Promise<
    { avgLen: number | null }[]
  > {
    return this.prisma.client.$queryRaw<{ avgLen: number | null }[]>`
      SELECT AVG(LENGTH("failureReason"))::float AS "avgLen"
      FROM "LoginAttempt"
      WHERE success = false AND "failureReason" IS NOT NULL
    `;
  }

  // Query type 13: Query with aggregate function and a HAVING condition
  async queryType13_emailsHavingAtLeastFailedAttempts(
    minFails: number,
  ): Promise<{ email: string; failedCount: number }[]> {
    return this.prisma.client.$queryRaw<{ email: string; failedCount: number }[]>`
      SELECT la.email, COUNT(*)::int AS "failedCount"
      FROM "LoginAttempt" la
      WHERE la.success = false AND la."attemptedAt" >= NOW() - INTERVAL '14 days'
      GROUP BY la.email
      HAVING COUNT(*) >= ${minFails}
      ORDER BY "failedCount" DESC
      LIMIT 15
    `;
  }

  // Query type 14: Query with aggregate function, HAVING condition, regular WHERE condition, and ORDER BY
  async queryType14_ipFailedStatsFilteredHavingOrdered(): Promise<
    { ipAddress: string; failedCount: number }[]
  > {
    return this.prisma.client.$queryRaw<{ ipAddress: string; failedCount: number }[]>`
      SELECT la."ipAddress", COUNT(*)::int AS "failedCount"
      FROM "LoginAttempt" la
      WHERE la.success = false
        AND la."attemptedAt" >= NOW() - INTERVAL '7 days'
        AND la."ipAddress" IS NOT NULL
      GROUP BY la."ipAddress"
      HAVING COUNT(*) >= 3
      ORDER BY "failedCount" DESC, la."ipAddress" ASC
      LIMIT 10
    `;
  }

  // Query type 15: Query with INNER JOIN
  async queryType15_usersWithAssignedRolesInnerJoin(): Promise<
    { userId: number; email: string; roleName: string }[]
  > {
    return this.prisma.client.$queryRaw<
      { userId: number; email: string; roleName: string }[]
    >`
      SELECT u.id AS "userId", u.email, r.name AS "roleName"
      FROM "User" u
      INNER JOIN "UserRole" ur ON ur."userId" = u.id
      INNER JOIN "Role" r ON r.id = ur."roleId"
      ORDER BY u.email ASC, r.name ASC
      LIMIT 100
    `;
  }

  // Query type 16: Query with LEFT JOIN
  async queryType16_usersIncludingThoseWithoutRoles(): Promise<
    { userId: number; email: string; roleName: string | null }[]
  > {
    return this.prisma.client.$queryRaw<
      { userId: number; email: string; roleName: string | null }[]
    >`
      SELECT u.id AS "userId", u.email, r.name AS "roleName"
      FROM "User" u
      LEFT JOIN "UserRole" ur ON ur."userId" = u.id
      LEFT JOIN "Role" r ON r.id = ur."roleId"
      ORDER BY u.email ASC
      LIMIT 100
    `;
  }

  // Query type 17: Query with RIGHT JOIN
  async queryType17_loginAttemptsRightJoinUsers(): Promise<
    { attemptId: number | null; userEmail: string | null }[]
  > {
    return this.prisma.client.$queryRaw<
      { attemptId: number | null; userEmail: string | null }[]
    >`
      SELECT la.id AS "attemptId", u.email AS "userEmail"
      FROM "LoginAttempt" la
      RIGHT JOIN "User" u ON u.id = la."userId"
      ORDER BY la."attemptedAt" DESC NULLS LAST
      LIMIT 50
    `;
  }

  // Query type 18: Query with INNER JOIN and condition
  async queryType18_innerJoinUsersRolesActiveOnly(): Promise<
    { email: string; roleName: string }[]
  > {
    return this.prisma.client.$queryRaw<{ email: string; roleName: string }[]>`
      SELECT u.email, r.name AS "roleName"
      FROM "User" u
      INNER JOIN "UserRole" ur ON ur."userId" = u.id
      INNER JOIN "Role" r ON r.id = ur."roleId"
      WHERE u.status = 'ACTIVE'::"UserStatus"
      ORDER BY u.email ASC
      LIMIT 80
    `;
  }

  // Query type 19: Query with INNER JOIN and LIKE condition
  async queryType19_innerJoinUserRolesEmailLike(pattern: string): Promise<
    { email: string; roleName: string }[]
  > {
    return this.prisma.client.$queryRaw<{ email: string; roleName: string }[]>`
      SELECT u.email, r.name AS "roleName"
      FROM "User" u
      INNER JOIN "UserRole" ur ON ur."userId" = u.id
      INNER JOIN "Role" r ON r.id = ur."roleId"
      WHERE u.email LIKE ${pattern}
      ORDER BY u.email ASC
      LIMIT 50
    `;
  }

  // Query type 20: Query with INNER JOIN and aggregate function
  async queryType20_permissionsPerRoleInnerJoinAgg(): Promise<
    { roleName: string; permCount: number }[]
  > {
    return this.prisma.client.$queryRaw<{ roleName: string; permCount: number }[]>`
      SELECT r.name AS "roleName", COUNT(rp."permissionId")::int AS "permCount"
      FROM "Role" r
      INNER JOIN "RolePermission" rp ON rp."roleId" = r.id
      GROUP BY r.id, r.name
      ORDER BY "permCount" DESC
      LIMIT 50
    `;
  }

  // Query type 21: Query with INNER JOIN, aggregate function, and HAVING
  async queryType21_rolesWithAtLeastPermissions(minPerms: number): Promise<
    { roleName: string; permCount: number }[]
  > {
    return this.prisma.client.$queryRaw<{ roleName: string; permCount: number }[]>`
      SELECT r.name AS "roleName", COUNT(rp."permissionId")::int AS "permCount"
      FROM "Role" r
      INNER JOIN "RolePermission" rp ON rp."roleId" = r.id
      GROUP BY r.id, r.name
      HAVING COUNT(rp."permissionId") >= ${minPerms}
      ORDER BY "permCount" DESC
      LIMIT 30
    `;
  }

  // Query type 22: Query with subquery using =, <, or >
  async queryType22_usersAboveAverageFailedLoginCount(): Promise<
    { id: number; email: string; failedLoginCount: number }[]
  > {
    return this.prisma.client.$queryRaw<
      { id: number; email: string; failedLoginCount: number }[]
    >`
      SELECT u.id, u.email, u."failedLoginCount"
      FROM "User" u
      WHERE u."failedLoginCount" > (
        SELECT AVG(u2."failedLoginCount") FROM "User" u2
      )
      ORDER BY u."failedLoginCount" DESC
      LIMIT 50
    `;
  }

  // Query type 23: Query with subquery using aggregate function
  async queryType23_usersNearMaxLockoutPressure(): Promise<
    { id: number; email: string; failedLoginCount: number }[]
  > {
    return this.prisma.client.$queryRaw<
      { id: number; email: string; failedLoginCount: number }[]
    >`
      SELECT u.id, u.email, u."failedLoginCount"
      FROM "User" u
      WHERE u."failedLoginCount" >= (
        SELECT MAX(u2."failedLoginCount") * 0.5 FROM "User" u2 WHERE u2.status = 'ACTIVE'::"UserStatus"
      )
      ORDER BY u."failedLoginCount" DESC
      LIMIT 30
    `;
  }

  // Query type 24: Query with subquery using EXISTS
  async queryType24_usersWithHighSeveritySecurityEvents(): Promise<
    { id: number; email: string }[]
  > {
    return this.prisma.client.$queryRaw<{ id: number; email: string }[]>`
      SELECT u.id, u.email
      FROM "User" u
      WHERE EXISTS (
        SELECT 1
        FROM "SecurityEvent" se
        WHERE se."userId" = u.id AND se.severity = 'HIGH'::"Severity"
      )
      ORDER BY u.email ASC
      LIMIT 50
    `;
  }

  // Query type 25: Query with subquery using ANY or SOME
  async queryType25_usersHavingAnyOfRoles(roleIds: number[]): Promise<
    { id: number; email: string }[]
  > {
    if (!roleIds.length) return [];
    const idList = Prisma.join(roleIds);
    return this.prisma.client.$queryRaw<{ id: number; email: string }[]>`
      SELECT u.id, u.email
      FROM "User" u
      WHERE u.id = ANY(SELECT ur."userId" FROM "UserRole" ur WHERE ur."roleId" IN (${idList}))
      ORDER BY u.email ASC
      LIMIT 80
    `;
  }

  // Query type 26: Query with subquery using IN
  async queryType26_loginAttemptsForBlockedUsers(): Promise<
    { id: number; email: string; success: boolean }[]
  > {
    return this.prisma.client.$queryRaw<
      { id: number; email: string; success: boolean }[]
    >`
      SELECT la.id, la.email, la.success
      FROM "LoginAttempt" la
      WHERE la."userId" IN (
        SELECT u.id FROM "User" u WHERE u.status = 'BLOCKED'::"UserStatus"
      )
      ORDER BY la."attemptedAt" DESC
      LIMIT 100
    `;
  }

  // Query type 27: Query with subquery and INNER JOIN
  async queryType27_recentFailedAttemptsJoinedToUserSubquery(): Promise<
    { attemptId: number; email: string; attemptedAt: Date }[]
  > {
    return this.prisma.client.$queryRaw<
      { attemptId: number; email: string; attemptedAt: Date }[]
    >`
      SELECT la.id AS "attemptId", u.email, la."attemptedAt"
      FROM "LoginAttempt" la
      INNER JOIN "User" u ON u.id = la."userId"
      WHERE la.id IN (
        SELECT la2.id
        FROM "LoginAttempt" la2
        WHERE la2.success = false
        ORDER BY la2."attemptedAt" DESC
        LIMIT 200
      )
      ORDER BY la."attemptedAt" DESC
      LIMIT 50
    `;
  }

  /** Dashboard: risky emails (uses type 13-style HAVING — kept for API parity). */
  async getRiskyUsersByFailedCount(): Promise<{ email: string; failedCount: number }[]> {
    return this.queryType13_emailsHavingAtLeastFailedAttempts(3);
  }

  /** Dashboard: risky IPs (uses type 14-style filters). */
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

  /** Dashboard top risky users list (aggregate + group by). */
  async getTopRiskyUserEmails(): Promise<{ email: string; failedCount: number }[]> {
    return this.prisma.client.$queryRaw<{ email: string; failedCount: number }[]>`
      SELECT la.email, COUNT(*)::int AS "failedCount"
      FROM "LoginAttempt" la
      WHERE la.success = false AND la."attemptedAt" >= NOW() - INTERVAL '7 days'
      GROUP BY la.email
      ORDER BY "failedCount" DESC
      LIMIT 5
    `;
  }
}
