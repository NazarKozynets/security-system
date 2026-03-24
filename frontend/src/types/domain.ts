export type UserStatus = 'ACTIVE' | 'BLOCKED' | 'DISABLED';

export type EventSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type EventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'PASSWORD_CHANGED'
  | 'ROLE_ASSIGNED'
  | 'ROLE_REMOVED'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_BLOCKED'
  | 'PERMISSION_CHANGED'
  | 'REPORT_GENERATED';

export interface AuthUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  status: UserStatus;
  roles: string[];
  permissions: string[];
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  tokenType: 'Bearer';
  user: AuthUser;
}

/** Matches backend mapUserResponse */
export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  status: UserStatus;
  roles: string[];
  permissions?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Permission {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  createdAt: string;
}

export interface RolePermissionLink {
  roleId: number;
  permissionId: number;
  assignedAt: string;
  permission: Permission;
}

export interface Role {
  id: number;
  name: string;
  description?: string | null;
  createdAt: string;
  rolePermissions?: RolePermissionLink[];
}

export interface LoginAttempt {
  id: number;
  userId: number | null;
  email: string;
  ipAddress: string | null;
  userAgent: string | null;
  success: boolean;
  failureReason: string | null;
  attemptedAt: string;
}

export interface SecurityEvent {
  id: number;
  userId: number | null;
  eventType: EventType;
  severity: EventSeverity;
  entityType: string | null;
  entityId: string | null;
  description: string;
  metadata?: unknown;
  ipAddress: string | null;
  createdAt: string;
}

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  blockedUsers: number;
  failedLast24h: number;
  eventsLast7d: number;
  topRiskyUsers: { email: string; failedCount: number }[];
}

export interface LoginAttemptsReport {
  summary: { total: number; failed: number; successful: number };
  rows: LoginAttempt[];
}

export interface SuspiciousActivityReport {
  riskyUsers: { email: string; failedCount: number }[];
  riskyIps: { ipAddress: string; failedCount: number }[];
  blockedUsers: User[];
  highSeverityEvents: SecurityEvent[];
}

export interface UserAccessOverview {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  status: UserStatus;
  roles: string[];
  permissions: string[];
}
