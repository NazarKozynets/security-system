import type { AuthUser } from '../../types/domain';

/** Roles that typically use the admin panel in demos */
const PANEL_ROLES = new Set(['admin', 'security_analyst', 'operator', 'auditor']);

/**
 * Any permission that implies access to at least part of the security UI.
 * Regular "user" role in seed has no permissions.
 */
const PANEL_PERMISSION_HINTS = [
  'user.read',
  'role.read',
  'permission.read',
  'security.log.read',
  'security.report.read',
  'user.create',
  'role.manage',
  'permission.manage',
];

export function hasRole(user: AuthUser | null, role: string): boolean {
  if (!user) return false;
  return user.roles.includes(role);
}

export function hasPermission(user: AuthUser | null, permission: string): boolean {
  if (!user) return false;
  return user.permissions.includes(permission);
}

export function hasAnyPermission(user: AuthUser | null, permissions: string[]): boolean {
  if (!user) return false;
  return permissions.some((p) => user.permissions.includes(p));
}

/** Can open the admin shell (sidebar). Backend still enforces each API. */
export function hasAdminPanelAccess(user: AuthUser | null): boolean {
  if (!user) return false;
  if (user.roles.some((r) => PANEL_ROLES.has(r))) return true;
  return PANEL_PERMISSION_HINTS.some((p) => user.permissions.includes(p));
}

export function hasAllPermissions(user: AuthUser | null, permissions: string[]): boolean {
  if (!user) return false;
  return permissions.every((p) => user.permissions.includes(p));
}
