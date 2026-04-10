import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma/prisma.service';

export type RefreshTokenRow = {
  id: number;
  userId: number;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedById: number | null;
  createdAt: Date;
};

type Tx = Prisma.TransactionClient;

// Interface for repository for RefreshToken model
interface IRefreshTokenRepository {
  // Create a new refresh token
  create(
    data: { userId: number; tokenHash: string; expiresAt: Date },
    tx?: Tx,
  ): Promise<RefreshTokenRow>;

  // Find an active refresh token by token hash
  findActiveByTokenHash(
    tokenHash: string,
    tx?: Tx,
  ): Promise<RefreshTokenRow | null>;

  // Mark a refresh token as revoked
  markRevoked(
      id: number,
      replacedById: number,
      tx?: Tx,
  ): Promise<void>;

  // Revoke all active refresh tokens for a user
  revokeAllActiveForUser(
      userId: number,
      tokenHash: string,
      tx?: Tx
  ): Promise<void>;
}

@Injectable()
export class RefreshTokenRepository implements IRefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  private db(tx?: Tx) {
    return tx ?? this.prisma.client;
  }

  // Create a new refresh token
  async create(
    data: { userId: number; tokenHash: string; expiresAt: Date },
    tx?: Tx,
  ): Promise<RefreshTokenRow> {
    const rows = await this.db(tx).$queryRaw<RefreshTokenRow[]>`
      INSERT INTO "RefreshToken" ("userId", "tokenHash", "expiresAt")
      VALUES (${data.userId}, ${data.tokenHash}, ${data.expiresAt})
      RETURNING
        id,
        "userId",
        "tokenHash",
        "expiresAt",
        "revokedAt",
        "replacedById",
        "createdAt"
    `;
    return rows[0];
  }

  // Find an active refresh token by token hash
  async findActiveByTokenHash(
    tokenHash: string,
    tx?: Tx,
  ): Promise<RefreshTokenRow | null> {
    const rows = await this.db(tx).$queryRaw<RefreshTokenRow[]>`
      SELECT
        id,
        "userId",
        "tokenHash",
        "expiresAt",
        "revokedAt",
        "replacedById",
        "createdAt"
      FROM "RefreshToken"
      WHERE "tokenHash" = ${tokenHash} AND "revokedAt" IS NULL
      LIMIT 1
    `;
    return rows[0] ?? null;
  }

  // Mark a refresh token as revoked
  async markRevoked(
    id: number,
    replacedById: number,
    tx?: Tx,
  ): Promise<void> {
    await this.db(tx).$executeRaw`
      UPDATE "RefreshToken"
      SET "revokedAt" = NOW(), "replacedById" = ${replacedById}
      WHERE id = ${id}
    `;
  }

  // Revoke all active refresh tokens for a user
  async revokeAllActiveForUser(userId: number, tokenHash: string, tx?: Tx): Promise<void> {
    await this.db(tx).$executeRaw`
      UPDATE "RefreshToken"
      SET "revokedAt" = NOW()
      WHERE "userId" = ${userId} AND "tokenHash" = ${tokenHash} AND "revokedAt" IS NULL
    `;
  }
}
