import { Injectable } from '@nestjs/common';
import { EventType, Prisma, Severity } from '@prisma/client';
import { PrismaService } from '../database/prisma/prisma.service';

export type SecurityEventRow = {
  id: number;
  userId: number | null;
  eventType: EventType;
  severity: Severity;
  entityType: string | null;
  entityId: string | null;
  description: string;
  metadata: unknown | null;
  ipAddress: string | null;
  createdAt: Date;
};

type Tx = Prisma.TransactionClient;

@Injectable()
export class SecurityEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  private db(tx?: Tx) {
    return tx ?? this.prisma.client;
  }

  async create(
    data: {
      userId?: number | null;
      eventType: EventType;
      severity: Severity;
      entityType?: string | null;
      entityId?: string | null;
      description: string;
      metadata?: unknown;
      ipAddress?: string | null;
    },
    tx?: Tx,
  ): Promise<void> {
    const metaSql =
      data.metadata === undefined || data.metadata === null
        ? Prisma.sql`NULL`
        : Prisma.sql`${JSON.stringify(data.metadata)}::jsonb`;
    await this.db(tx).$executeRaw`
      INSERT INTO "SecurityEvent" (
        "userId",
        "eventType",
        severity,
        "entityType",
        "entityId",
        description,
        metadata,
        "ipAddress"
      ) VALUES (
        ${data.userId ?? null},
        ${data.eventType}::"EventType",
        ${data.severity}::"Severity",
        ${data.entityType ?? null},
        ${data.entityId ?? null},
        ${data.description},
        ${metaSql},
        ${data.ipAddress ?? null}
      )
    `;
  }

  async findManyPaginated(
    params: {
      page: number;
      limit: number;
      eventType?: EventType;
      severity?: Severity;
    },
    tx?: Tx,
  ): Promise<SecurityEventRow[]> {
    const offset = (params.page - 1) * params.limit;
    const conditions: Prisma.Sql[] = [Prisma.sql`TRUE`];
    if (params.eventType !== undefined)
      conditions.push(Prisma.sql`"eventType" = ${params.eventType}::"EventType"`);
    if (params.severity !== undefined)
      conditions.push(Prisma.sql`severity = ${params.severity}::"Severity"`);
    const where = Prisma.join(conditions, ' AND ');
    return this.db(tx).$queryRaw<SecurityEventRow[]>`
      SELECT
        id,
        "userId",
        "eventType",
        severity,
        "entityType",
        "entityId",
        description,
        metadata,
        "ipAddress",
        "createdAt"
      FROM "SecurityEvent"
      WHERE ${where}
      ORDER BY "createdAt" DESC
      LIMIT ${params.limit} OFFSET ${offset}
    `;
  }

  async findById(id: number, tx?: Tx): Promise<SecurityEventRow | null> {
    const rows = await this.db(tx).$queryRaw<SecurityEventRow[]>`
      SELECT
        id,
        "userId",
        "eventType",
        severity,
        "entityType",
        "entityId",
        description,
        metadata,
        "ipAddress",
        "createdAt"
      FROM "SecurityEvent"
      WHERE id = ${id}
      LIMIT 1
    `;
    return rows[0] ?? null;
  }

  async findManyForReport(params: {
    eventType?: EventType;
    severity?: Severity;
    from?: Date;
    to?: Date;
    take?: number;
  }): Promise<SecurityEventRow[]> {
    const conditions: Prisma.Sql[] = [Prisma.sql`TRUE`];
    if (params.eventType !== undefined)
      conditions.push(Prisma.sql`"eventType" = ${params.eventType}::"EventType"`);
    if (params.severity !== undefined)
      conditions.push(Prisma.sql`severity = ${params.severity}::"Severity"`);
    if (params.from)
      conditions.push(Prisma.sql`"createdAt" >= ${params.from}`);
    if (params.to) conditions.push(Prisma.sql`"createdAt" <= ${params.to}`);
    const where = Prisma.join(conditions, ' AND ');
    const take = params.take ?? 200;
    return this.prisma.client.$queryRaw<SecurityEventRow[]>`
      SELECT
        id,
        "userId",
        "eventType",
        severity,
        "entityType",
        "entityId",
        description,
        metadata,
        "ipAddress",
        "createdAt"
      FROM "SecurityEvent"
      WHERE ${where}
      ORDER BY "createdAt" DESC
      LIMIT ${take}
    `;
  }

  async findManyForCsv(params: {
    eventType?: string;
    severity?: string;
    from?: Date;
    to?: Date;
  }): Promise<SecurityEventRow[]> {
    const conditions: Prisma.Sql[] = [Prisma.sql`TRUE`];
    if (params.eventType)
      conditions.push(
        Prisma.sql`"eventType" = ${params.eventType}::"EventType"`,
      );
    if (params.severity)
      conditions.push(Prisma.sql`severity = ${params.severity}::"Severity"`);
    if (params.from)
      conditions.push(Prisma.sql`"createdAt" >= ${params.from}`);
    if (params.to) conditions.push(Prisma.sql`"createdAt" <= ${params.to}`);
    const where = Prisma.join(conditions, ' AND ');
    return this.prisma.client.$queryRaw<SecurityEventRow[]>`
      SELECT
        id,
        "userId",
        "eventType",
        severity,
        "entityType",
        "entityId",
        description,
        metadata,
        "ipAddress",
        "createdAt"
      FROM "SecurityEvent"
      WHERE ${where}
      ORDER BY "createdAt" DESC
      LIMIT 5000
    `;
  }

  async countForDashboard(since: Date): Promise<number> {
    const rows = await this.prisma.client.$queryRaw<{ c: number }[]>`
      SELECT COUNT(*)::int AS c
      FROM "SecurityEvent"
      WHERE "createdAt" >= ${since}
    `;
    return rows[0]?.c ?? 0;
  }

  async findHighSeverityRecent(
    severities: Severity[],
    take: number,
  ): Promise<SecurityEventRow[]> {
    if (!severities.length) return [];
    const tuples = severities.map((s) => Prisma.sql`${s}::"Severity"`);
    return this.prisma.client.$queryRaw<SecurityEventRow[]>`
      SELECT
        id,
        "userId",
        "eventType",
        severity,
        "entityType",
        "entityId",
        description,
        metadata,
        "ipAddress",
        "createdAt"
      FROM "SecurityEvent"
      WHERE severity IN (${Prisma.join(tuples)})
      ORDER BY "createdAt" DESC
      LIMIT ${take}
    `;
  }
}
