import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma/prisma.service';

type Tx = Prisma.TransactionClient;

// Interface for repository for UserRole model
interface IUserRoleRepository {
  // Insert many user-role pairs
  insertMany(pairs: { userId: number; roleId: number }[]): Promise<void>;

  // Delete all user-role pairs for a user
  deleteAllForUser(userId: number): Promise<void>;

  // Delete a specific user-role pair
  deletePair(userId: number, roleId: number): Promise<void>;
}

@Injectable()
export class UserRoleRepository implements IUserRoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  private db(tx?: Tx) {
    // If there's a transaction, use it, otherwise use the default client
    return tx ?? this.prisma.client;
  }

  // Insert many user-role pairs
  async insertMany(
    pairs: { userId: number; roleId: number }[],
    tx?: Tx,
  ): Promise<void> {
    if (!pairs.length) return;
    const tuples: Prisma.Sql[] = pairs.map(
      (p) => Prisma.sql`(${p.userId}, ${p.roleId})`,
    );
    await this.db(tx).$executeRaw`
      INSERT INTO "UserRole" ("userId", "roleId") VALUES ${Prisma.join(tuples)} ON CONFLICT ("userId", "roleId") DO NOTHING
    `;
  }

  // Delete all user-role pairs for a user
  async deleteAllForUser(userId: number, tx?: Tx): Promise<void> {
    await this.db(tx).$executeRaw`
      DELETE FROM "UserRole" WHERE "userId" = ${userId}
    `;
  }

  // Delete a specific user-role pair
  async deletePair(userId: number, roleId: number, tx?: Tx): Promise<void> {
    await this.db(tx).$executeRaw`
      DELETE FROM "UserRole"
      WHERE "userId" = ${userId} AND "roleId" = ${roleId}
    `;
  }
}
