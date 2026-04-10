jest.mock('../../../prisma/prisma.client', () => {
  return {
    prisma: {
      $connect: jest.fn().mockResolvedValue(undefined),
      $disconnect: jest.fn().mockResolvedValue(undefined),
      $queryRaw: jest.fn(),
      $executeRaw: jest.fn(),
      $queryRawUnsafe: jest.fn(),
      $executeRawUnsafe: jest.fn(),
      $transaction: jest.fn(),
    },
    prismaPool: { end: jest.fn().mockResolvedValue(undefined) },
  };
});

import { prisma, prismaPool } from '../../../prisma/prisma.client';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  it('onModuleInit connects and onModuleDestroy disconnects pool', async () => {
    const svc = new PrismaService();
    await svc.onModuleInit();
    expect(prisma.$connect).toHaveBeenCalled();
    await svc.onModuleDestroy();
    expect(prisma.$disconnect).toHaveBeenCalled();
    expect(prismaPool.end).toHaveBeenCalled();
  });

  it('exposes the shared client and raw SQL helpers', () => {
    const svc = new PrismaService();
    expect(svc.client).toBe(prisma);
    expect(typeof svc.$queryRaw).toBe('function');
  });
});
