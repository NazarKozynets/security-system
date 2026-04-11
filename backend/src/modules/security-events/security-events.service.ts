import {Injectable} from '@nestjs/common';
import {EventType, Severity} from '@prisma/client';
import {SecurityEventRepository} from '../../repositories/security-event.repository';

// Interface for SecurityEventsService
interface ISecurityEventsService {
    // Find all security events with pagination
    findAll(params: {
        page: number;
        limit: number;
        eventType?: EventType;
        severity?: Severity;
    }): Promise<any[]>;

    // Find a single security event by ID
    findOne(id: number): Promise<any | null>;
}

@Injectable()
export class SecurityEventsService implements ISecurityEventsService {
    constructor(
        private readonly securityEventRepository: SecurityEventRepository,
    ) {
    }

    // Find all security events with pagination
    findAll(params: {
        page: number;
        limit: number;
        eventType?: EventType;
        severity?: Severity;
    }) {
        return this.securityEventRepository.findManyPaginated(params);
    }

    // Find a single security event by ID
    findOne(id: number) {
        return this.securityEventRepository.findById(id);
    }
}
