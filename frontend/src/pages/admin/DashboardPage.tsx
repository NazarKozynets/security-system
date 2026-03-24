import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { reportsApi } from '../../api/reports.api';
import type { DashboardStats } from '../../types/domain';
import { getErrorMessage } from '../../shared/lib/errors';
import { Card } from '../../shared/ui/Card';
import { EmptyState } from '../../shared/ui/EmptyState';
import { PageHeader } from '../../shared/ui/PageHeader';
import { Spinner } from '../../shared/ui/Spinner';
import { Button } from '../../shared/ui/Button';
import styles from './DashboardPage.module.css';

export function DashboardPage() {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await reportsApi.dashboard();
        setData(res);
      } catch (e) {
        setError(getErrorMessage(e));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  if (loading) return <Spinner />;
  if (error) return <EmptyState title="Could not load dashboard" description={error} />;
  if (!data) return null;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Key metrics for security posture and user activity."
      />
      <div className={styles.metrics}>
        <Card compact>
          <div className={styles.metricLabel}>Total users</div>
          <div className={styles.metricValue}>{data.totalUsers}</div>
        </Card>
        <Card compact>
          <div className={styles.metricLabel}>Active users</div>
          <div className={styles.metricValue}>{data.activeUsers}</div>
        </Card>
        <Card compact>
          <div className={styles.metricLabel}>Blocked users</div>
          <div className={styles.metricValue}>{data.blockedUsers}</div>
        </Card>
        <Card compact>
          <div className={styles.metricLabel}>Failed logins (24h)</div>
          <div className={styles.metricValue}>{data.failedLast24h}</div>
        </Card>
        <Card compact>
          <div className={styles.metricLabel}>Security events (7d)</div>
          <div className={styles.metricValue}>{data.eventsLast7d}</div>
        </Card>
      </div>

      <div style={{ marginTop: 24 }}>
        <Card>
        <h3 style={{ marginTop: 0 }}>Top risky emails (failed attempts, 7d)</h3>
        {data.topRiskyUsers.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>No data.</p>
        ) : (
          <ul className={styles.riskList}>
            {data.topRiskyUsers.map((row) => (
              <li key={row.email}>
                <span>{row.email}</span>
                <span className={styles.badge}>{row.failedCount} fails</span>
              </li>
            ))}
          </ul>
        )}
        </Card>
      </div>

      <div className={styles.tiles}>
        <Link to="/admin/users">
          <Button variant="secondary" type="button">
            Manage users
          </Button>
        </Link>
        <Link to="/admin/reports">
          <Button variant="secondary" type="button">
            Reports
          </Button>
        </Link>
        <Link to="/admin/login-attempts">
          <Button variant="secondary" type="button">
            Login attempts
          </Button>
        </Link>
        <Link to="/admin/security-events">
          <Button variant="secondary" type="button">
            Security events
          </Button>
        </Link>
      </div>
    </div>
  );
}
