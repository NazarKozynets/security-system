import { Link } from 'react-router-dom';
import { useAuth } from '../../providers/AuthProvider';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { PageHeader } from '../../shared/ui/PageHeader';
import { StatusBadge } from '../../shared/ui/Badge';

export function ProfilePage() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <div>
      <PageHeader title="Profile" subtitle="Your authenticated session." />
      <Card compact>
        <p style={{ marginTop: 0 }}>
          <strong>
            {user.firstName} {user.lastName}
          </strong>
        </p>
        <p style={{ margin: '4px 0' }}>{user.email}</p>
        <p style={{ margin: '8px 0' }}>
          Status: <StatusBadge status={user.status} />
        </p>
        <h4 style={{ marginBottom: 8 }}>Roles</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {user.roles.map((r) => (
            <Badge key={r} tone="info">
              {r}
            </Badge>
          ))}
        </div>
        <h4 style={{ marginBottom: 8 }}>Permissions</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {user.permissions.map((p) => (
            <Badge key={p} tone="neutral">
              {p}
            </Badge>
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Button type="button" onClick={() => void logout()}>
            Sign out
          </Button>
          <Link to="/">
            <Button variant="secondary" type="button">
              Public home
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
