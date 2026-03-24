import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';
import { Button } from '../shared/ui/Button';
import styles from './AdminLayout.module.css';

const links = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/roles', label: 'Roles' },
  { to: '/admin/permissions', label: 'Permissions' },
  { to: '/admin/login-attempts', label: 'Login attempts' },
  { to: '/admin/security-events', label: 'Security events' },
  { to: '/admin/reports', label: 'Reports' },
  { to: '/admin/profile', label: 'Profile' },
];

export function AdminLayout() {
  const { user, logout } = useAuth();

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>Security Console</div>
        <nav className={styles.nav}>
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `${styles.link} ${isActive ? styles.linkActive : ''}`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className={styles.content}>
        <header className={styles.topbar}>
          <span className={styles.pageTitle}>Administration</span>
          <div className={styles.userMenu}>
            <span>
              {user?.firstName} {user?.lastName}
            </span>
            <Button variant="secondary" size="sm" type="button" onClick={() => void logout()}>
              Logout
            </Button>
          </div>
        </header>
        <div className={styles.main}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
