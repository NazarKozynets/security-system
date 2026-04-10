import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma/prisma.service';

export type PermissionRow = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  createdAt: Date;
};

type Tx = Prisma.TransactionClient;

@Injectable()
export class PermissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  private db(tx?: Tx) {
    return tx ?? this.prisma.client;
  }

  async findAllOrdered(tx?: Tx): Promise<PermissionRow[]> {
    return this.db(tx).$queryRaw<PermissionRow[]>`
      SELECT id, code, name, description, "createdAt"
      FROM "Permission"
      ORDER BY code ASC
    `;
  }

  async create(
    data: { code: string; name: string; description?: string },
    tx?: Tx,
  ): Promise<PermissionRow> {
    const rows = await this.db(tx).$queryRaw<PermissionRow[]>`
      INSERT INTO "Permission" (code, name, description)
      VALUES (${data.code}, ${data.name}, ${data.description ?? null})
      RETURNING id, code, name, description, "createdAt"
    `;
    return rows[0];
  }

  async update(
    id: number,
    data: { code?: string; name?: string; description?: string },
    tx?: Tx,
  ): Promise<PermissionRow> {
    const sets: Prisma.Sql[] = [];
    if (data.code !== undefined) sets.push(Prisma.sql`code = ${data.code}`);
    if (data.name !== undefined) sets.push(Prisma.sql`name = ${data.name}`);
    if (data.description !== undefined)
      sets.push(Prisma.sql`description = ${data.description}`);
    if (!sets.length) {
      const rows = await this.db(tx).$queryRaw<PermissionRow[]>`
        SELECT id, code, name, description, "createdAt" FROM "Permission" WHERE id = ${id}
      `;
      return rows[0];
    }
    const rows = await this.db(tx).$queryRaw<PermissionRow[]>`
      UPDATE "Permission"
      SET ${Prisma.join(sets, ', ')}
      WHERE id = ${id}
      RETURNING id, code, name, description, "createdAt"
    `;
    return rows[0];
  }

  async deleteById(id: number, tx?: Tx): Promise<void> {
    await this.db(tx).$executeRaw`
      DELETE FROM "Permission" WHERE id = ${id}
    `;
  }
}
