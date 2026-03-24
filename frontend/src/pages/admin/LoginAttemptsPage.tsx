import { useEffect, useMemo, useState } from 'react';
import { loginAttemptsApi } from '../../api/loginAttempts.api';
import type { LoginAttempt } from '../../types/domain';
import { getErrorMessage } from '../../shared/lib/errors';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { EmptyState } from '../../shared/ui/EmptyState';
import { Input } from '../../shared/ui/Input';
import { PageHeader } from '../../shared/ui/PageHeader';
import { Select } from '../../shared/ui/Select';
import { Spinner } from '../../shared/ui/Spinner';
import { Table, Td, Tr } from '../../shared/ui/Table';

export function LoginAttemptsPage() {
  const [rows, setRows] = useState<LoginAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [emailFilter, setEmailFilter] = useState('');
  const [successFilter, setSuccessFilter] = useState<string>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const data = await loginAttemptsApi.list(1, 200);
      setRows(data);
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

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (emailFilter && !r.email.toLowerCase().includes(emailFilter.toLowerCase())) return false;
      if (successFilter === 'true' && !r.success) return false;
      if (successFilter === 'false' && r.success) return false;
      if (from) {
        const t = new Date(r.attemptedAt).getTime();
        if (t < new Date(from).getTime()) return false;
      }
      if (to) {
        const t = new Date(r.attemptedAt).getTime();
        if (t > new Date(to).getTime()) return false;
      }
      return true;
    });
  }, [rows, emailFilter, successFilter, from, to]);

  if (loading) return <Spinner />;
  if (error) return <EmptyState title="Could not load login attempts" description={error} />;

  return (
    <div>
      <PageHeader
        title="Login attempts"
        subtitle="Authentication activity (client-side filters on loaded page)."
      />
      <Card compact>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          <Input label="Email contains" value={emailFilter} onChange={(e) => setEmailFilter(e.target.value)} />
          <Select label="Success" value={successFilter} onChange={(e) => setSuccessFilter(e.target.value)}>
            <option value="">Any</option>
            <option value="true">Success</option>
            <option value="false">Failure</option>
          </Select>
          <Input label="From (ISO)" type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label="To (ISO)" type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div style={{ marginTop: 12 }}>
          <Button variant="secondary" size="sm" type="button" onClick={() => void load()}>
            Reload from API
          </Button>
        </div>
      </Card>

      <div style={{ marginTop: 16 }}>
        <Card compact>
        <Table headers={['Time', 'Email', 'User ID', 'OK', 'IP', 'Reason']}>
          {filtered.map((r) => (
            <Tr key={r.id}>
              <Td>{new Date(r.attemptedAt).toLocaleString()}</Td>
              <Td>{r.email}</Td>
              <Td>{r.userId ?? '—'}</Td>
              <Td>{r.success ? 'Yes' : 'No'}</Td>
              <Td>{r.ipAddress ?? '—'}</Td>
              <Td>{r.failureReason ?? '—'}</Td>
            </Tr>
          ))}
        </Table>
        {filtered.length === 0 ? (
          <p style={{ margin: 12, color: 'var(--color-text-muted)' }}>No rows match.</p>
        ) : null}
        </Card>
      </div>
    </div>
  );
}
