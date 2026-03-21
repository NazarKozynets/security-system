import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LoginAttemptsService {
  constructor(private readonly prisma: PrismaService) {}
  findAll(page = 1, limit = 20) {
    return this.prisma.loginAttempt.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { attemptedAt: 'desc' },
    });
  }
  findOne(id: number) { return this.prisma.loginAttempt.findUnique({ where: { id } }); }
}
