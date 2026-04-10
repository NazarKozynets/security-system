import {Injectable} from '@nestjs/common';
import {Prisma, UserStatus} from '@prisma/client';
import {PrismaService} from '../database/prisma/prisma.service';
import {buildUserWithRbacFromFlatRows} from './user-rbac.mapper';
import {UserRbacFlatRow, UserWithRbac} from './user-rbac.types';

type Tx = Prisma.TransactionClient;

// Interface for repository for User model
interface IUserRepository {
    // Checks if user with given email exists
    emailExists(email: string, tx?: Tx): Promise<boolean>;

    // Finds user by id with all its roles and permissions
    findByIdWithRbac(id: number, tx?: Tx): Promise<UserWithRbac | null>;

    // Finds user by email with all its roles and permissions
    findByEmailWithRbac(email: string, tx?: Tx): Promise<UserWithRbac | null>;

    // Finds all users paginated
    findAllPaginated(page: number, limit: number, tx?: Tx): Promise<UserWithRbac[]>;

    // Creates new user
    create(data: {
        email: string;
        passwordHash: string;
        firstName: string;
        lastName: string;
        status?: UserStatus;
    }, tx?: Tx): Promise<{ id: number }>;

    // Updates user (find by id and update fields)
    updateFields(
        id: number,
        data: {
            email?: string;
            firstName?: string;
            lastName?: string;
            status?: UserStatus;
            passwordHash?: string;
            failedLoginCount?: number;
            lockoutUntil?: Date | null;
        },
        tx?: Tx,
    ): Promise<void>;

    // Counts total users amount
    countTotal(tx?: Tx): Promise<number>;

    // Counts filtered by status users
    countByStatus(status: UserStatus, tx?: Tx): Promise<number>;

    // Find many users by status
    findManyByStatusPublicFields(
        status: UserStatus,
        take: number,
        tx?: Tx,
    ): Promise<
        Array<{
            id: number;
            email: string;
            firstName: string;
            lastName: string;
            status: UserStatus;
            createdAt: Date;
            updatedAt: Date;
        }>
    >;

    // Update user status
    updateStatus(
        id: number,
        status: UserStatus,
        tx?: Tx,
    ): Promise<{
        id: number;
        email: string;
        firstName: string;
        lastName: string;
        status: UserStatus;
        createdAt: Date;
        updatedAt: Date;
    }>;
}

@Injectable()
export class UserRepository implements IUserRepository {
    constructor(private readonly prisma: PrismaService) {
    }

    private db(tx?: Tx) {
        return tx ?? this.prisma.client;
    }

    // Checks if user with given email exists
    async emailExists(email: string, tx?: Tx): Promise<boolean> {
        const rows = await this.db(tx).$queryRaw<{ ok: number }[]>`
            SELECT 1 AS ok
            FROM "User"
            WHERE email = ${email}
            LIMIT 1
        `;
        return rows.length > 0;
    }

    // Finds user by id with all its roles and permissions
    async findByIdWithRbac(id: number, tx?: Tx): Promise<UserWithRbac | null> {
        const rows = await this.db(tx).$queryRaw<UserRbacFlatRow[]>`
            SELECT u.id,
                   u.email, 
                   u."passwordHash",
                   u."firstName",
                   u."lastName",
                   u.status,
                   u."failedLoginCount",
                   u."lockoutUntil",
                   u."createdAt",
                   u."updatedAt",
                   r.id   AS "roleId",
                   r.name AS "roleName",
                   p.code AS "permCode"
            FROM "User" u
                     LEFT JOIN "UserRole" ur ON ur."userId" = u.id
                     LEFT JOIN "Role" r ON r.id = ur."roleId"
                     LEFT JOIN "RolePermission" rp ON rp."roleId" = r.id
                     LEFT JOIN "Permission" p ON p.id = rp."permissionId"
            WHERE u.id = ${id}
        `;
        return buildUserWithRbacFromFlatRows(rows);
    }

    // Finds user by email with all its roles and permissions
    async findByEmailWithRbac(email: string, tx?: Tx): Promise<UserWithRbac | null> {
        const rows = await this.db(tx).$queryRaw<UserRbacFlatRow[]>`
            SELECT u.id,
                   u.email,
                   u."passwordHash",
                   u."firstName",
                   u."lastName",
                   u.status,
                   u."failedLoginCount",
                   u."lockoutUntil",
                   u."createdAt",
                   u."updatedAt",
                   r.id   AS "roleId",
                   r.name AS "roleName",
                   p.code AS "permCode"
            FROM "User" u
                     LEFT JOIN "UserRole" ur ON ur."userId" = u.id
                     LEFT JOIN "Role" r ON r.id = ur."roleId"
                     LEFT JOIN "RolePermission" rp ON rp."roleId" = r.id
                     LEFT JOIN "Permission" p ON p.id = rp."permissionId"
            WHERE u.email = ${email}
        `;
        return buildUserWithRbacFromFlatRows(rows);
    }

    // Finds all users paginated
    async findAllPaginated(
        page: number,
        limit: number,
        tx?: Tx,
    ): Promise<UserWithRbac[]> {
        const offset = (page - 1) * limit;
        const idRows = await this.db(tx).$queryRaw<{ id: number }[]>`
            SELECT id
            FROM "User"
            ORDER BY "createdAt" DESC
            LIMIT ${limit} OFFSET ${offset}
        `;
        const ids = idRows.map((r) => r.id);
        if (ids.length === 0) return [];

        const rows = await this.db(tx).$queryRaw<UserRbacFlatRow[]>`
            SELECT u.id,
                   u.email,
                   u."passwordHash",
                   u."firstName",
                   u."lastName",
                   u.status,
                   u."failedLoginCount",
                   u."lockoutUntil",
                   u."createdAt",
                   u."updatedAt",
                   r.id   AS "roleId",
                   r.name AS "roleName",
                   p.code AS "permCode"
            FROM "User" u
                     LEFT JOIN "UserRole" ur ON ur."userId" = u.id
                     LEFT JOIN "Role" r ON r.id = ur."roleId"
                     LEFT JOIN "RolePermission" rp ON rp."roleId" = r.id
                     LEFT JOIN "Permission" p ON p.id = rp."permissionId"
            WHERE u.id IN (${Prisma.join(ids)})
            ORDER BY u."createdAt" DESC
        `;
        const byUser = new Map<number, UserRbacFlatRow[]>();
        for (const row of rows) {
            const list = byUser.get(row.id) ?? [];
            list.push(row);
            byUser.set(row.id, list);
        }
        return ids
            .map((id) => buildUserWithRbacFromFlatRows(byUser.get(id) ?? []))
            .filter((u): u is UserWithRbac => u !== null);
    }

    // Creates new user
    async create(
        data: {
            email: string;
            passwordHash: string;
            firstName: string;
            lastName: string;
            status?: UserStatus;
        },
        tx?: Tx,
    ): Promise<{ id: number }> {
        const status = data.status ?? UserStatus.ACTIVE;
        const inserted = await this.db(tx).$queryRaw<{ id: number }[]>`
            INSERT INTO "User" (email, "passwordHash", "firstName", "lastName", status, "updatedAt")
            VALUES (${data.email},
                    ${data.passwordHash},
                    ${data.firstName},
                    ${data.lastName},
                    ${status}::"UserStatus",
                    NOW())
            RETURNING id
        `;
        return inserted[0];
    }

    // Updates user (find by id and update fields)
    async updateFields(
        id: number,
        data: {
            email?: string;
            firstName?: string;
            lastName?: string;
            status?: UserStatus;
            passwordHash?: string;
            failedLoginCount?: number;
            lockoutUntil?: Date | null;
        },
        tx?: Tx,
    ): Promise<void> {
        const sets: Prisma.Sql[] = [];
        if (data.email !== undefined) sets.push(Prisma.sql`email = ${data.email}`);
        if (data.firstName !== undefined)
            sets.push(Prisma.sql`"firstName" = ${data.firstName}`);
        if (data.lastName !== undefined)
            sets.push(Prisma.sql`"lastName" = ${data.lastName}`);
        if (data.status !== undefined)
            sets.push(Prisma.sql`status = ${data.status}::"UserStatus"`);
        if (data.passwordHash !== undefined)
            sets.push(Prisma.sql`"passwordHash" = ${data.passwordHash}`);
        if (data.failedLoginCount !== undefined)
            sets.push(Prisma.sql`"failedLoginCount" = ${data.failedLoginCount}`);
        if (data.lockoutUntil !== undefined)
            sets.push(Prisma.sql`"lockoutUntil" = ${data.lockoutUntil}`);
        if (!sets.length) return;
        await this.db(tx).$executeRaw`
            UPDATE "User"
            SET ${Prisma.join(sets, ', ')}
            WHERE id = ${id}
        `;
    }

    // Counts total users
    async countTotal(tx?: Tx): Promise<number> {
        const rows = await this.db(tx).$queryRaw<{ c: number }[]>`
            SELECT COUNT(*)::int AS c
            FROM "User"
        `;
        return rows[0]?.c ?? 0;
    }

    // Counts filtered by status users
    async countByStatus(status: UserStatus, tx?: Tx): Promise<number> {
        const rows = await this.db(tx).$queryRaw<{ c: number }[]>`
            SELECT COUNT(*)::int AS c
            FROM "User"
            WHERE status = ${status}::"UserStatus"
        `;
        return rows[0]?.c ?? 0;
    }

    // Find many users by status
    async findManyByStatusPublicFields(
        status: UserStatus,
        take: number,
        tx?: Tx,
    ): Promise<
        Array<{
            id: number;
            email: string;
            firstName: string;
            lastName: string;
            status: UserStatus;
            createdAt: Date;
            updatedAt: Date;
        }>
    > {
        return this.db(tx).$queryRaw<
            Array<{
                id: number;
                email: string;
                firstName: string;
                lastName: string;
                status: UserStatus;
                createdAt: Date;
                updatedAt: Date;
            }>
        >`
            SELECT id, email, "firstName", "lastName", status, "createdAt", "updatedAt"
            FROM "User"
            WHERE status = ${status}::"UserStatus"
            LIMIT ${take}
        `;
    }

    // Update user status
    async updateStatus(
        id: number,
        status: UserStatus,
        tx?: Tx,
    ): Promise<{
        id: number;
        email: string;
        firstName: string;
        lastName: string;
        status: UserStatus;
        createdAt: Date;
        updatedAt: Date;
    }> {
        const rows = await this.db(tx).$queryRaw<
            {
                id: number;
                email: string;
                firstName: string;
                lastName: string;
                status: UserStatus;
                createdAt: Date;
                updatedAt: Date;
            }[]
        >`
            UPDATE "User"
            SET status = ${status}::"UserStatus"
            WHERE id = ${id}
            RETURNING id, email, "firstName", "lastName", status, "createdAt", "updatedAt"
        `;
        return rows[0];
    }
}
