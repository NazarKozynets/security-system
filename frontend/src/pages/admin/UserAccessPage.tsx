import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { reportsApi } from '../../api/reports.api';
import type { UserAccessOverview } from '../../types/domain';
import { getErrorMessage } from '../../shared/lib/errors';
import { Badge, StatusBadge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { EmptyState } from '../../shared/ui/EmptyState';
import { PageHeader } from '../../shared/ui/PageHeader';
import { Spinner } from '../../shared/ui/Spinner';

export function UserAccessPage() {
  const { id } = useParams();
  const userId = Number(id);
  const [data, setData] = useState<UserAccessOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!userId || Number.isNaN(userId)) return;
      try {
        setLoading(true);
        const res = await reportsApi.userAccess(userId);
        setData(res);
        setError('');
      } catch (e) {
        setError(getErrorMessage(e));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [userId]);

  if (loading) return <Spinner />;
  if (error) return <EmptyState title="Overview unavailable" description={error} />;
  if (!data) return <EmptyState title="User not found" />;

  return (
    <div>
      <PageHeader
        title="User access overview"
        subtitle="RBAC summary suitable for demonstration."
        actions={
          <Link to={`/admin/users/${data.id}`}>
            <Button variant="secondary" type="button">
              User record
            </Button>
          </Link>
        }
      />

      <div style={{ display: 'grid', gap: 16 }}>
        <Card compact>
          <h3 style={{ marginTop: 0 }}>Identity</h3>
          <p style={{ margin: 0 }}>
            <strong>
              {data.firstName} {data.lastName}
            </strong>{' '}
            — {data.email}
          </p>
          <p style={{ margin: '8px 0 0' }}>
            Status: <StatusBadge status={data.status} />
          </p>
        </Card>
        <Card compact>
          <h3 style={{ marginTop: 0 }}>Roles</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {data.roles.map((r) => (
              <Badge key={r} tone="info">
                {r}
              </Badge>
            ))}
          </div>
        </Card>
        <Card compact>
          <h3 style={{ marginTop: 0 }}>Effective permissions</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {data.permissions.map((p) => (
              <Badge key={p} tone="neutral">
                {p}
              </Badge>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
