import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma/prisma.service';

// $queryRaw type for Permission model
export type PermissionRow = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  createdAt: Date;
};

type Tx = Prisma.TransactionClient;

// Interface for repository for Permission model
interface IPermissionRepository {
  // Finds all permissions ordered by code
  findAllOrdered(tx?: Tx): Promise<PermissionRow[]>;

  // Creates new permission
  create(data: { code: string; name: string; description?: string }, tx?: Tx): Promise<PermissionRow>;

  // Updates permission (find by id and update fields)
  update(id: number, data: { code?: string; name?: string; description?: string }, tx?: Tx): Promise<PermissionRow>;

  // Deletes permission by id
  deleteById(id: number, tx?: Tx): Promise<void>;
}

@Injectable()
export class PermissionRepository implements IPermissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  private db(tx?: Tx) {
    return tx ?? this.prisma.client;
  }

  // Finds all permissions ordered by code
  async findAllOrdered(tx?: Tx): Promise<PermissionRow[]> {
    return this.db(tx).$queryRaw<PermissionRow[]>`
      SELECT id, code, name, description, "createdAt"
      FROM "Permission"
      ORDER BY code ASC
    `;
  }

  // Creates new permission
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

  // Updates permission (find by id and update fields)
  async update(
    id: number,
    data: { code?: string; name?: string; description?: string },
    tx?: Tx,
  ): Promise<PermissionRow> {
    const sets: Prisma.Sql[] = [];

    if (data.code !== undefined) sets.push(Prisma.sql`code = ${data.code}`);
    if (data.name !== undefined) sets.push(Prisma.sql`name = ${data.name}`);
    if (data.description !== undefined) sets.push(Prisma.sql`description = ${data.description}`);

    // If no fields are provided, return the original row
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

  // Deletes permission by id
  async deleteById(id: number, tx?: Tx): Promise<void> {
    await this.db(tx).$executeRaw`
      DELETE FROM "Permission" WHERE id = ${id}
    `;
  }
}
