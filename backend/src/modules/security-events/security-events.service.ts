import { Injectable } from '@nestjs/common';
import { EventType, Severity } from '@prisma/client';
import { SecurityEventRepository } from '../../repositories/security-event.repository';

@Injectable()
export class SecurityEventsService {
  constructor(
    private readonly securityEventRepository: SecurityEventRepository,
  ) {}
  findAll(params: {
    page: number;
    limit: number;
    eventType?: EventType;
    severity?: Severity;
  }) {
    return this.securityEventRepository.findManyPaginated(params);
  }
  findOne(id: number) {
    return this.securityEventRepository.findById(id);
  }
}
