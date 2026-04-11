import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma/prisma.service';

export type RoleWithPermissions = {
  id: number;
  name: string;
  description: string | null;
  createdAt: Date;
  rolePermissions: { permission: { id: number; code: string; name: string } }[];
};

type RoleFlatRow = {
  id: number;
  name: string;
  description: string | null;
  createdAt: Date;
  permId: number | null;
  permCode: string | null;
  permName: string | null;
};

type Tx = Prisma.TransactionClient;

function buildRolesFromRows(rows: RoleFlatRow[]): RoleWithPermissions[] {
  const map = new Map<number, RoleWithPermissions>();
  for (const row of rows) {
    if (!map.has(row.id)) {
      map.set(row.id, {
        id: row.id,
        name: row.name,
        description: row.description,
        createdAt: row.createdAt,
        rolePermissions: [],
      });
    }
    if (row.permId != null && row.permCode != null && row.permName != null) {
      const role = map.get(row.id)!;
      if (!role.rolePermissions.some((rp) => rp.permission.id === row.permId)) {
        role.rolePermissions.push({
          permission: {
            id: row.permId,
            code: row.permCode,
            name: row.permName,
          },
        });
      }
    }
  }
  return [...map.values()];
}

// Interface for repository for Role model
interface IRoleRepository {
  // Finds role by name
  findByName(name: string, tx?: Tx): Promise<{ id: number } | null>;

  // Finds all roles with their permissions
  findAllWithPermissions(tx?: Tx): Promise<RoleWithPermissions[]>;

  // Creates new role
  create(data: { name: string; description?: string }, tx?: Tx): Promise<{ id: number; name: string; description: string | null; createdAt: Date }>;

  // Updates role (find by id and update fields)
  update(id: number, data: { name?: string; description?: string }, tx?: Tx): Promise<{ id: number; name: string; description: string | null; createdAt: Date }>;

  // Deletes role by id
  deleteById(id: number, tx?: Tx): Promise<void>;
}

@Injectable()
export class RoleRepository implements IRoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  private db(tx?: Tx) {
    return tx ?? this.prisma.client;
  }

  // Finds role by name
  async findByName(name: string, tx?: Tx): Promise<{ id: number } | null> {
    const rows = await this.db(tx).$queryRaw<{ id: number }[]>`
      SELECT id FROM "Role" WHERE name = ${name} LIMIT 1
    `;
    return rows[0] ?? null;
  }

  // Finds all roles with their permissions
  async findAllWithPermissions(tx?: Tx): Promise<RoleWithPermissions[]> {
    const rows = await this.db(tx).$queryRaw<RoleFlatRow[]>`
      SELECT
        r.id,
        r.name,
        r.description,
        r."createdAt",
        p.id AS "permId",
        p.code AS "permCode",
        p.name AS "permName"
      FROM "Role" r
      LEFT JOIN "RolePermission" rp ON rp."roleId" = r.id
      LEFT JOIN "Permission" p ON p.id = rp."permissionId"
      ORDER BY r.id ASC, p.code ASC
    `;
    return buildRolesFromRows(rows);
  }

  // Creates new role
  async create(
    data: { name: string; description?: string },
    tx?: Tx,
  ): Promise<{ id: number; name: string; description: string | null; createdAt: Date }> {
    const rows = await this.db(tx).$queryRaw<
      {
        id: number;
        name: string;
        description: string | null;
        createdAt: Date;
      }[]
    >`
      INSERT INTO "Role" (name, description)
      VALUES (${data.name}, ${data.description ?? null})
      RETURNING id, name, description, "createdAt"
    `;
    return rows[0];
  }

  // Updates role (find by id and update fields)
  async update(
    id: number,
    data: { name?: string; description?: string },
    tx?: Tx,
  ): Promise<{
    id: number;
    name: string;
    description: string | null;
    createdAt: Date;
  }> {
    const sets: Prisma.Sql[] = [];

    if (data.name !== undefined) sets.push(Prisma.sql`name = ${data.name}`);

    if (data.description !== undefined) sets.push(Prisma.sql`description = ${data.description}`);

    if (!sets.length) {
      const rows = await this.db(tx).$queryRaw<
        {
          id: number;
          name: string;
          description: string | null;
          createdAt: Date;
        }[]
      >`
        SELECT id, name, description, "createdAt" FROM "Role" WHERE id = ${id}
      `;
      return rows[0];
    }

    const rows = await this.db(tx).$queryRaw<
      {
        id: number;
        name: string;
        description: string | null;
        createdAt: Date;
      }[]
    >`
      UPDATE "Role"
      SET ${Prisma.join(sets, ', ')}
      WHERE id = ${id}
      RETURNING id, name, description, "createdAt"
    `;
    return rows[0];
  }

  // Deletes role by id
  async deleteById(id: number, tx?: Tx): Promise<void> {
    await this.db(tx).$executeRaw`
      DELETE FROM "Role" WHERE id = ${id}
    `;
  }
}
