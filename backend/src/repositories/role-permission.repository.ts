import {Injectable} from '@nestjs/common';
import {Prisma} from '@prisma/client';
import {PrismaService} from '../database/prisma/prisma.service';

type Tx = Prisma.TransactionClient;

// Interface for repository for RolePermission model
interface IRolePermissionRepository {
    // Inserts many role-permission pairs
    insertMany(pairs: { roleId: number; permissionId: number }[]): Promise<void>;

    // Deletes a specific role-permission pair
    deletePair(roleId: number, permissionId: number): Promise<void>;
}

@Injectable()
export class RolePermissionRepository implements IRolePermissionRepository {
    constructor(private readonly prisma: PrismaService) {
    }

    private db(tx?: Tx) {
        return tx ?? this.prisma.client;
    }

    // Inserts many role-permission pairs
    async insertMany(
        pairs: { roleId: number; permissionId: number }[],
        tx?: Tx,
    ): Promise<void> {
        if (!pairs.length) return;
        const tuples: Prisma.Sql[] = pairs.map(
            (p) => Prisma.sql`(${p.roleId}, ${p.permissionId})`,
        );
        await this.db(tx).$executeRaw`
            INSERT INTO "RolePermission" ("roleId", "permissionId")  VALUES ${Prisma.join(tuples)} ON CONFLICT ("roleId", "permissionId") DO NOTHING
        `;
    }

    // Deletes a specific role-permission pair
    async deletePair(roleId: number, permissionId: number, tx?: Tx): Promise<void> {
        await this.db(tx).$executeRaw`
            DELETE
            FROM "RolePermission"
            WHERE "roleId" = ${roleId}
              AND "permissionId" = ${permissionId}
        `;
    }
}
