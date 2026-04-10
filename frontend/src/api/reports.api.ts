import type {
  DashboardStats,
  LoginAttemptsReport,
  SecurityEvent,
  SuspiciousActivityReport,
  UserAccessOverview,
} from '../types/domain';
import { http } from './http';

function filenameFromContentDisposition(header: string | undefined, fallback: string): string {
  if (!header) return fallback;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf8) {
    try {
      return decodeURIComponent(utf8[1].trim());
    } catch {
      return utf8[1];
    }
  }
  const quoted = /filename="([^"]+)"/i.exec(header);
  if (quoted) return quoted[1];
  const plain = /filename=([^;\s]+)/i.exec(header);
  if (plain) return plain[1].replace(/"/g, '');
  return fallback;
}

function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

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

  downloadLoginAttemptsCsv: async (params: LoginAttemptsReportQuery) => {
    const res = await http.get<Blob>('/reports/export/login-attempts.csv', {
      params,
      responseType: 'blob',
    });
    const name = filenameFromContentDisposition(
      res.headers['content-disposition'],
      'login-attempts.csv',
    );
    triggerBrowserDownload(res.data, name);
  },

  downloadSecurityEventsCsv: async (params: SecurityEventsReportQuery) => {
    const res = await http.get<Blob>('/reports/export/security-events.csv', {
      params,
      responseType: 'blob',
    });
    const name = filenameFromContentDisposition(
      res.headers['content-disposition'],
      'security-events.csv',
    );
    triggerBrowserDownload(res.data, name);
  },

  downloadSummaryPdf: async () => {
    const res = await http.get<Blob>('/reports/export/summary.pdf', { responseType: 'blob' });
    const name = filenameFromContentDisposition(
      res.headers['content-disposition'],
      'security-summary.pdf',
    );
    triggerBrowserDownload(res.data, name);
  },
};
