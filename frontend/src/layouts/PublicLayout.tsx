import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';
import { hasAdminPanelAccess } from '../shared/lib/rbac';
import { Button } from '../shared/ui/Button';
import styles from './PublicLayout.module.css';

export function PublicLayout() {
  const { isAuthenticated, user, logout } = useAuth();
  const admin = user && hasAdminPanelAccess(user);

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link to="/" className={styles.logo}>
          Security Management
        </Link>
        <nav className={styles.nav}>
          {admin ? (
            <Link to="/admin" className={`${styles.navBtn} ${styles.navBtnSecondary}`}>
              Admin panel
            </Link>
          ) : null}
          {!isAuthenticated ? (
            <Link to="/login" className={`${styles.navBtn} ${styles.navBtnPrimary}`}>
              Sign in
            </Link>
          ) : (
            <Button variant="ghost" size="sm" type="button" onClick={() => void logout()}>
              Sign out
            </Button>
          )}
        </nav>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
