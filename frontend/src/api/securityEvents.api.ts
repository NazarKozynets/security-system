import type { EventSeverity, EventType, SecurityEvent } from '../types/domain';
import { http } from './http';

export interface SecurityEventQuery {
  page?: number;
  limit?: number;
  eventType?: EventType;
  severity?: EventSeverity;
}

export const securityEventsApi = {
  list: (params: SecurityEventQuery = {}) =>
    http.get<SecurityEvent[]>('/security-events', { params }).then((r) => r.data),
  get: (id: number) => http.get<SecurityEvent>(`/security-events/${id}`).then((r) => r.data),
};
