import type {
  DashboardStats,
  LoginAttemptsReport,
  SecurityEvent,
  SuspiciousActivityReport,
  UserAccessOverview,
} from '../types/domain';
import { http } from './http';

export interface LoginAttemptsReportQuery {
  from?: string;
  to?: string;
  userId?: number;
  success?: string;
}

export interface SecurityEventsReportQuery {
  from?: string;
  to?: string;
  eventType?: string;
  severity?: string;
}

export const reportsApi = {
  dashboard: () => http.get<DashboardStats>('/reports/dashboard').then((r) => r.data),
  loginAttempts: (params: LoginAttemptsReportQuery) =>
    http.get<LoginAttemptsReport>('/reports/login-attempts', { params }).then((r) => r.data),
  securityEvents: (params: SecurityEventsReportQuery) =>
    http.get<SecurityEvent[]>('/reports/security-events', { params }).then((r) => r.data),
  suspiciousActivity: () =>
    http.get<SuspiciousActivityReport>('/reports/suspicious-activity').then((r) => r.data),
  userAccess: (userId: number) =>
    http.get<UserAccessOverview | null>(`/reports/user-access/${userId}`).then((r) => r.data),
};
