import { Link } from 'react-router-dom';
import { useAuth } from '../../providers/AuthProvider';
import { hasAdminPanelAccess } from '../../shared/lib/rbac';
import { Button } from '../../shared/ui/Button';
import styles from './HomePage.module.css';

export function HomePage() {
  const { isAuthenticated, user } = useAuth();
  const canAdmin = user && hasAdminPanelAccess(user);

  return (
    <section className={styles.hero}>
      <div className={styles.heroCard}>
        <h1 className={styles.heroTitle}>Security Management System</h1>
        <p className={styles.heroText}>
          A central place to manage access control, review authentication activity, and
          generate security reports. Administrators can maintain users, roles, and
          permissions; auditors can review login history and security events.
        </p>
        <div className={styles.actions}>
          {!isAuthenticated ? (
            <>
              <Link to="/login">
                <Button type="button">Sign in</Button>
              </Link>
              <Link to="/signup">
                <Button type="button" variant="secondary">
                  Create account
                </Button>
              </Link>
            </>
          ) : canAdmin ? (
            <Link to="/admin">
              <Button type="button">Open admin dashboard</Button>
            </Link>
          ) : (
            <p style={{ margin: 0, alignSelf: 'center', color: 'var(--color-text-muted)' }}>
              You are signed in. This interface is optimized for security administrators.
            </p>
          )}
        </div>
        <ul className={styles.points}>
          <li>Role-based access control (RBAC) with fine-grained permissions</li>
          <li>Login attempt tracking and security event auditing</li>
          <li>Reporting for compliance reviews and incident awareness</li>
        </ul>
      </div>
    </section>
  );
}
