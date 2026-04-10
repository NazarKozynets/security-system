import { useEffect, useState } from 'react';
import { reportsApi } from '../../api/reports.api';
import type { LoginAttemptsReport } from '../../types/domain';
import { getErrorMessage } from '../../shared/lib/errors';
import { Card } from '../../shared/ui/Card';
import { Input } from '../../shared/ui/Input';
import { PageHeader } from '../../shared/ui/PageHeader';
import { Button } from '../../shared/ui/Button';
import { Spinner } from '../../shared/ui/Spinner';
import { EmptyState } from '../../shared/ui/EmptyState';
import { Table, Td, Tr } from '../../shared/ui/Table';
import { Select } from '../../shared/ui/Select';

export function ReportsLoginAttemptsPage() {
  const [data, setData] = useState<LoginAttemptsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [success, setSuccess] = useState('');
  const [userId, setUserId] = useState('');
  const [downloading, setDownloading] = useState(false);

  const reportParams = {
    from: from || undefined,
    to: to || undefined,
    success: success || undefined,
    userId: userId ? Number(userId) : undefined,
  };

  const load = async () => {
    try {
      setLoading(true);
      const res = await reportsApi.loginAttempts(reportParams);
      setData(res);
      setError('');
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleDownloadCsv = async () => {
    try {
      setDownloading(true);
      await reportsApi.downloadLoginAttemptsCsv(reportParams);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setDownloading(false);
    }
  };

  if (loading && !data) return <Spinner />;
  if (error) return <EmptyState title="Report failed" description={error} />;
  if (!data) return null;

  return (
    <div>
      <PageHeader title="Login attempts report" subtitle="Server-side aggregation via /reports/login-attempts" />
      <Card compact>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          <Input label="From" type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label="To" type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
          <Input label="User ID" value={userId} onChange={(e) => setUserId(e.target.value)} />
          <Select label="Success" value={success} onChange={(e) => setSuccess(e.target.value)}>
            <option value="">Any</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </Select>
        </div>
        <div
          style={{
            marginTop: 12,
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <Button type="button" onClick={() => void load()}>
            Apply filters
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={downloading}
            onClick={() => void handleDownloadCsv()}
          >
            {downloading ? 'Downloading…' : 'Download CSV'}
          </Button>
        </div>
      </Card>

      <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
        <Card compact>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600 }}>TOTAL</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{data.summary.total}</div>
        </Card>
        <Card compact>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600 }}>FAILED</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{data.summary.failed}</div>
        </Card>
        <Card compact>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600 }}>OK</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{data.summary.successful}</div>
        </Card>
      </div>

      <div style={{ marginTop: 16 }}>
        <Card compact>
          <h3 style={{ marginTop: 0 }}>Sample rows</h3>
          <Table headers={['Time', 'Email', 'OK', 'IP']}>
            {data.rows.map((r) => (
              <Tr key={r.id}>
                <Td>{new Date(r.attemptedAt).toLocaleString()}</Td>
                <Td>{r.email}</Td>
                <Td>{r.success ? 'Yes' : 'No'}</Td>
                <Td>{r.ipAddress ?? '—'}</Td>
              </Tr>
            ))}
          </Table>
        </Card>
      </div>
    </div>
  );
}
