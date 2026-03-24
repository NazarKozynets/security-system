import { Route, Routes } from 'react-router-dom';
import { AdminLayout } from '../layouts/AdminLayout';
import { PublicLayout } from '../layouts/PublicLayout';
import { DashboardPage } from '../pages/admin/DashboardPage';
import { LoginAttemptsPage } from '../pages/admin/LoginAttemptsPage';
import { PermissionsPage } from '../pages/admin/PermissionsPage';
import { ProfilePage } from '../pages/admin/ProfilePage';
import { ReportsHubPage } from '../pages/admin/ReportsHubPage';
import { ReportsLoginAttemptsPage } from '../pages/admin/ReportsLoginAttemptsPage';
import { ReportsSecurityEventsPage } from '../pages/admin/ReportsSecurityEventsPage';
import { ReportsSuspiciousPage } from '../pages/admin/ReportsSuspiciousPage';
import { RolesPage } from '../pages/admin/RolesPage';
import { SecurityEventsPage } from '../pages/admin/SecurityEventsPage';
import { UserAccessPage } from '../pages/admin/UserAccessPage';
import { UserDetailPage } from '../pages/admin/UserDetailPage';
import { UsersPage } from '../pages/admin/UsersPage';
import { LoginPage } from '../pages/auth/LoginPage';
import { ForbiddenPage } from '../pages/errors/ForbiddenPage';
import { NotFoundPage } from '../pages/errors/NotFoundPage';
import { HomePage } from '../pages/home/HomePage';
import { RequireAdmin } from './guards';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forbidden" element={<ForbiddenPage />} />
      </Route>

      <Route element={<RequireAdmin />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<DashboardPage />} />
          <Route path="/admin/users" element={<UsersPage />} />
          <Route path="/admin/users/:id" element={<UserDetailPage />} />
          <Route path="/admin/roles" element={<RolesPage />} />
          <Route path="/admin/permissions" element={<PermissionsPage />} />
          <Route path="/admin/login-attempts" element={<LoginAttemptsPage />} />
          <Route path="/admin/security-events" element={<SecurityEventsPage />} />
          <Route path="/admin/reports" element={<ReportsHubPage />} />
          <Route path="/admin/reports/login-attempts" element={<ReportsLoginAttemptsPage />} />
          <Route path="/admin/reports/security-events" element={<ReportsSecurityEventsPage />} />
          <Route path="/admin/reports/suspicious-activity" element={<ReportsSuspiciousPage />} />
          <Route path="/admin/user-access/:id" element={<UserAccessPage />} />
          <Route path="/admin/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
