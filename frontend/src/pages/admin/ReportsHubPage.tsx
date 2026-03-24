import { Link } from 'react-router-dom';
import { Card } from '../../shared/ui/Card';
import { PageHeader } from '../../shared/ui/PageHeader';
import styles from './ReportsHubPage.module.css';

const tiles = [
  { to: '/admin/reports/login-attempts', title: 'Login attempts report', desc: 'Aggregated counts and sample rows' },
  { to: '/admin/reports/security-events', title: 'Security events report', desc: 'Filtered event listing' },
  { to: '/admin/reports/suspicious-activity', title: 'Suspicious activity', desc: 'Risky users, IPs, blocked accounts' },
];

export function ReportsHubPage() {
  return (
    <div>
      <PageHeader title="Reports" subtitle="Analytics views for coursework demonstration." />
      <div className={styles.grid}>
        {tiles.map((t) => (
          <Link key={t.to} to={t.to} className={styles.tileLink}>
            <Card compact>
              <h3 style={{ marginTop: 0 }}>{t.title}</h3>
              <p style={{ margin: 0, fontSize: 14 }}>{t.desc}</p>
            </Card>
          </Link>
        ))}
      </div>
      <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginTop: 24 }}>
        Use <strong>Users → View → Access overview</strong> or{' '}
        <code>/admin/user-access/:id</code> for RBAC-focused reports.
      </p>
    </div>
  );
}
