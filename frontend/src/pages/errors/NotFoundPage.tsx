import { Link } from 'react-router-dom';
import { Card } from '../../shared/ui/Card';
import { PageHeader } from '../../shared/ui/PageHeader';

export function NotFoundPage() {
  return (
    <div style={{ maxWidth: 560, margin: '48px auto', padding: '0 16px' }}>
      <PageHeader title="Page not found" subtitle="The page you requested does not exist." />
      <Card>
        <p style={{ marginTop: 0 }}>Check the URL or go back to the home page.</p>
        <Link to="/" style={{ fontWeight: 600 }}>
          Home
        </Link>
      </Card>
    </div>
  );
}
