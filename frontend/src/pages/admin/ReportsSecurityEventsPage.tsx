import { useEffect, useState } from 'react';
import { reportsApi } from '../../api/reports.api';
import type { SecurityEvent } from '../../types/domain';
import { getErrorMessage } from '../../shared/lib/errors';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { EmptyState } from '../../shared/ui/EmptyState';
import { Input } from '../../shared/ui/Input';
import { PageHeader } from '../../shared/ui/PageHeader';
import { Select } from '../../shared/ui/Select';
import { Spinner } from '../../shared/ui/Spinner';
import { Table, Td, Tr } from '../../shared/ui/Table';

export function ReportsSecurityEventsPage() {
  const [rows, setRows] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [eventType, setEventType] = useState('');
  const [severity, setSeverity] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const data = await reportsApi.securityEvents({
        from: from || undefined,
        to: to || undefined,
        eventType: eventType || undefined,
        severity: severity || undefined,
      });
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

  if (loading && rows.length === 0) return <Spinner />;
  if (error) return <EmptyState title="Report failed" description={error} />;

  return (
    <div>
      <PageHeader title="Security events report" subtitle="Uses /reports/security-events" />
      <Card compact>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          <Input label="From" type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label="To" type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
          <Input label="Event type" value={eventType} onChange={(e) => setEventType(e.target.value)} placeholder="LOGIN_FAILURE" />
          <Select label="Severity" value={severity} onChange={(e) => setSeverity(e.target.value)}>
            <option value="">Any</option>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="CRITICAL">CRITICAL</option>
          </Select>
        </div>
        <Button type="button" style={{ marginTop: 12 }} onClick={() => void load()}>
          Apply
        </Button>
      </Card>

      <div style={{ marginTop: 16 }}>
        <Card compact>
          <Table headers={['Time', 'Type', 'Severity', 'Description']}>
            {rows.map((r) => (
              <Tr key={r.id}>
                <Td>{new Date(r.createdAt).toLocaleString()}</Td>
                <Td>{r.eventType}</Td>
                <Td>{r.severity}</Td>
                <Td>{r.description}</Td>
              </Tr>
            ))}
          </Table>
        </Card>
      </div>
    </div>
  );
}
