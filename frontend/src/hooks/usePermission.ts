import { useAuth } from '../providers/AuthProvider';
import { hasAdminPanelAccess, hasAnyPermission, hasPermission, hasRole } from '../shared/lib/rbac';

export function usePermission() {
  const { user } = useAuth();

  return {
    user,
    can: (permission: string) => hasPermission(user, permission),
    canAny: (permissions: string[]) => hasAnyPermission(user, permissions),
    role: (role: string) => hasRole(user, role),
    canUseAdminPanel: () => hasAdminPanelAccess(user),
  };
}
