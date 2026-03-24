import { Link } from 'react-router-dom';
import { Card } from '../../shared/ui/Card';
import { PageHeader } from '../../shared/ui/PageHeader';

export function ForbiddenPage() {
  return (
    <div style={{ maxWidth: 560, margin: '48px auto', padding: '0 16px' }}>
      <PageHeader
        title="Access denied"
        subtitle="You do not have permission to open the administration area."
      />
      <Card>
        <p style={{ marginTop: 0 }}>
          If you believe this is a mistake, contact a system administrator or sign in with an
          account that has the appropriate security roles.
        </p>
        <Link to="/" style={{ fontWeight: 600 }}>
          Return to home
        </Link>
      </Card>
    </div>
  );
}
