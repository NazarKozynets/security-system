import { useEffect, useState } from 'react';
import { reportsApi } from '../../api/reports.api';
import type { SuspiciousActivityReport } from '../../types/domain';
import { getErrorMessage } from '../../shared/lib/errors';
import { Card } from '../../shared/ui/Card';
import { PageHeader } from '../../shared/ui/PageHeader';
import { Spinner } from '../../shared/ui/Spinner';
import { EmptyState } from '../../shared/ui/EmptyState';
import { Table, Td, Tr } from '../../shared/ui/Table';
import { StatusBadge } from '../../shared/ui/Badge';

export function ReportsSuspiciousPage() {
  const [data, setData] = useState<SuspiciousActivityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await reportsApi.suspiciousActivity();
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
  if (error) return <EmptyState title="Could not load report" description={error} />;
  if (!data) return null;

  return (
    <div>
      <PageHeader title="Suspicious activity" subtitle="Aggregations from /reports/suspicious-activity" />

      <div style={{ display: 'grid', gap: 16 }}>
        <Card compact>
          <h3 style={{ marginTop: 0 }}>Risky emails</h3>
          <Table headers={['Email', 'Failed (7d)']}>
            {data.riskyUsers.map((r) => (
              <Tr key={r.email}>
                <Td>{r.email}</Td>
                <Td>{r.failedCount}</Td>
              </Tr>
            ))}
          </Table>
        </Card>

        <Card compact>
          <h3 style={{ marginTop: 0 }}>Risky IPs</h3>
          <Table headers={['IP', 'Failed (7d)']}>
            {data.riskyIps.map((r) => (
              <Tr key={r.ipAddress}>
                <Td>{r.ipAddress}</Td>
                <Td>{r.failedCount}</Td>
              </Tr>
            ))}
          </Table>
        </Card>

        <Card compact>
          <h3 style={{ marginTop: 0 }}>Blocked users (sample)</h3>
          {data.blockedUsers.length === 0 ? (
            <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>None</p>
          ) : (
            <Table headers={['Email', 'Status']}>
              {data.blockedUsers.map((u) => (
                <Tr key={u.id}>
                  <Td>{u.email}</Td>
                  <Td>
                    <StatusBadge status={u.status} />
                  </Td>
                </Tr>
              ))}
            </Table>
          )}
        </Card>

        <Card compact>
          <h3 style={{ marginTop: 0 }}>High / critical events (sample)</h3>
          <Table headers={['Time', 'Severity', 'Description']}>
            {data.highSeverityEvents.map((e) => (
              <Tr key={e.id}>
                <Td>{new Date(e.createdAt).toLocaleString()}</Td>
                <Td>{e.severity}</Td>
                <Td>{e.description}</Td>
              </Tr>
            ))}
          </Table>
        </Card>
      </div>
    </div>
  );
}
