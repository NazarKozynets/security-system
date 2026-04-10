import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { prisma, prismaPool } from '../../../prisma/prisma.client';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  /** Use only for raw SQL and transactions in repositories — not for model delegates. */
  readonly client = prisma;

  $queryRaw = this.client.$queryRaw.bind(this.client);
  $executeRaw = this.client.$executeRaw.bind(this.client);
  $queryRawUnsafe = this.client.$queryRawUnsafe.bind(this.client);
  $executeRawUnsafe = this.client.$executeRawUnsafe.bind(this.client);
  $transaction = this.client.$transaction.bind(this.client);

  async onModuleInit() {
    await this.client.$connect();
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
    await prismaPool.end();
  }
}
