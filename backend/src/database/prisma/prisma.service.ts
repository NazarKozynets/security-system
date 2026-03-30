import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { prisma, prismaPool } from '../../../prisma/prisma.client';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly client = prisma;

  get user() {
    return this.client.user;
  }

  get role() {
    return this.client.role;
  }

  get userRole() {
    return this.client.userRole;
  }

  get permission() {
    return this.client.permission;
  }

  get rolePermission() {
    return this.client.rolePermission;
  }

  get loginAttempt() {
    return this.client.loginAttempt;
  }

  get securityEvent() {
    return this.client.securityEvent;
  }

  get refreshToken() {
    return this.client.refreshToken;
  }

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
