import { Injectable } from '@nestjs/common';
import { EventType, Severity } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SecurityEventsService {
  constructor(private readonly prisma: PrismaService) {}
  findAll(params: { page: number; limit: number; eventType?: EventType; severity?: Severity }) {
    return this.prisma.securityEvent.findMany({
      where: { eventType: params.eventType, severity: params.severity },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
      orderBy: { createdAt: 'desc' },
    });
  }
  findOne(id: number) { return this.prisma.securityEvent.findUnique({ where: { id } }); }
}
