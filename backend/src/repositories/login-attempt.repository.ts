import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma/prisma.service';

// Result of $queryRaw
export type LoginAttemptRow = {
  id: number;
  userId: number | null;
  email: string;
  ipAddress: string | null;
  userAgent: string | null;
  success: boolean;
  failureReason: string | null;
  attemptedAt: Date;
};

type Tx = Prisma.TransactionClient;

// Interface for repository for LoginAttempt model
interface ILoginAttemptRepository {
  // Create a new login attempt
  create(
    data: {
      userId?: number | null;
      email: string;
      ipAddress?: string | null;
      userAgent?: string | null;
      success: boolean;
      failureReason?: string | null;
    },
    tx?: Tx,
  ): Promise<void>;

  // Find all login attempts and paginate them
  findManyPaginated(
      page: number,
      limit: number,
      tx?: Tx,
  ): Promise<LoginAttemptRow[]>;

  // Find a login attempt by ID
  findById(id: number, tx?: Tx): Promise<LoginAttemptRow | null>;

  // Find filtered by date login attempts for report
  findManyForReport(params: {
    userId?: number;
    success?: boolean;
    from?: Date;
    to?: Date;
    orderDesc?: boolean;
    take?: number;
  }): Promise<LoginAttemptRow[]>;

  // Count login attempts for report
  countForReport(params: {
    userId?: number;
    success?: boolean;
    from?: Date;
    to?: Date;
  }): Promise<number>;

  // Find filtered by date login attempts for CSV export
  findManyForCsv(params: {
    userId?: number;
    success?: boolean;
    from?: Date;
    to?: Date;
  }): Promise<LoginAttemptRow[]>;
}

@Injectable()
export class LoginAttemptRepository implements ILoginAttemptRepository {
  constructor(private readonly prisma: PrismaService) {}

  private db(tx?: Tx) {
    return tx ?? this.prisma.client;
  }

  // Create a new login attempt
  async create(
    data: {
      userId?: number | null;
      email: string;
      ipAddress?: string | null;
      userAgent?: string | null;
      success: boolean;
      failureReason?: string | null;
    },
    tx?: Tx,
  ): Promise<void> {
    await this.db(tx).$executeRaw`
      INSERT INTO "LoginAttempt" (
        "userId", email, "ipAddress", "userAgent", success, "failureReason"
      ) VALUES (
        ${data.userId ?? null},
        ${data.email},
        ${data.ipAddress ?? null},
        ${data.userAgent ?? null},
        ${data.success},
        ${data.failureReason ?? null}
      )
    `;
  }

  // Find all login attempts and paginate them
  async findManyPaginated(
    page: number,
    limit: number,
    tx?: Tx,
  ): Promise<LoginAttemptRow[]> {
    const offset = (page - 1) * limit;

    return this.db(tx).$queryRaw<LoginAttemptRow[]>`
      SELECT
        id,
        "userId",
        email,
        "ipAddress",
        "userAgent",
        success,
        "failureReason",
        "attemptedAt"
      FROM "LoginAttempt"
      ORDER BY "attemptedAt" DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }

  // Find a login attempt by ID
  async findById(id: number, tx?: Tx): Promise<LoginAttemptRow | null> {
    const rows = await this.db(tx).$queryRaw<LoginAttemptRow[]>`
      SELECT
        id,
        "userId",
        email,
        "ipAddress",
        "userAgent",
        success,
        "failureReason",
        "attemptedAt"
      FROM "LoginAttempt"
      WHERE id = ${id}
      LIMIT 1
    `;

    return rows[0] ?? null;
  }

  // Find filtered by date login attempts for report
  async findManyForReport(params: {
    userId?: number;
    success?: boolean;
    from?: Date;
    to?: Date;
    orderDesc?: boolean;
    take?: number;
  }): Promise<LoginAttemptRow[]> {
    const conditions: Prisma.Sql[] = [Prisma.sql`TRUE`];

    if (params.userId !== undefined)
      conditions.push(Prisma.sql`"userId" = ${params.userId}`);

    if (params.success !== undefined)
      conditions.push(Prisma.sql`success = ${params.success}`);

    if (params.from)
      conditions.push(Prisma.sql`"attemptedAt" >= ${params.from}`);

    if (params.to) conditions.push(Prisma.sql`"attemptedAt" <= ${params.to}`);

    const where = Prisma.join(conditions, ' AND ');

    const take = params.take ?? 100;

    if (params.orderDesc === false) {
      return this.prisma.client.$queryRaw<LoginAttemptRow[]>`
        SELECT
          id,
          "userId",
          email,
          "ipAddress",
          "userAgent",
          success,
          "failureReason",
          "attemptedAt"
        FROM "LoginAttempt"
        WHERE ${where}
        ORDER BY "attemptedAt" ASC
        LIMIT ${take}
      `;
    }

    return this.prisma.client.$queryRaw<LoginAttemptRow[]>`
      SELECT
        id,
        "userId",
        email,
        "ipAddress",
        "userAgent",
        success,
        "failureReason",
        "attemptedAt"
      FROM "LoginAttempt"
      WHERE ${where}
      ORDER BY "attemptedAt" DESC
      LIMIT ${take}
    `;
  }

  // Count login attempts for report
  async countForReport(params: {
    userId?: number;
    success?: boolean;
    from?: Date;
    to?: Date;
  }): Promise<number> {
    const conditions: Prisma.Sql[] = [Prisma.sql`TRUE`];

    if (params.userId !== undefined)
      conditions.push(Prisma.sql`"userId" = ${params.userId}`);

    if (params.success !== undefined)
      conditions.push(Prisma.sql`success = ${params.success}`);

    if (params.from)
      conditions.push(Prisma.sql`"attemptedAt" >= ${params.from}`);

    if (params.to) conditions.push(Prisma.sql`"attemptedAt" <= ${params.to}`);

    const where = Prisma.join(conditions, ' AND ');

    const rows = await this.prisma.client.$queryRaw<{ c: bigint }[]>`
      SELECT COUNT(*)::int AS c FROM "LoginAttempt" WHERE ${where}
    `;

    return Number(rows[0]?.c ?? 0);
  }

  // Find filtered by date login attempts for CSV export
  async findManyForCsv(params: {
    userId?: number;
    success?: boolean;
    from?: Date;
    to?: Date;
  }): Promise<LoginAttemptRow[]> {
    return this.findManyForReport({
      ...params,
      take: 5000,
      orderDesc: true,
    });
  }
}
