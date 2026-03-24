import { useEffect, useState } from 'react';
import { securityEventsApi } from '../../api/securityEvents.api';
import type { EventSeverity, EventType, SecurityEvent } from '../../types/domain';
import { getErrorMessage } from '../../shared/lib/errors';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { EmptyState } from '../../shared/ui/EmptyState';
import { PageHeader } from '../../shared/ui/PageHeader';
import { Select } from '../../shared/ui/Select';
import { Spinner } from '../../shared/ui/Spinner';
import { Table, Td, Tr } from '../../shared/ui/Table';
import { Modal } from '../../shared/ui/Modal';

const EVENT_TYPES: EventType[] = [
  'LOGIN_SUCCESS',
  'LOGIN_FAILURE',
  'PASSWORD_CHANGED',
  'ROLE_ASSIGNED',
  'ROLE_REMOVED',
  'USER_CREATED',
  'USER_UPDATED',
  'USER_BLOCKED',
  'PERMISSION_CHANGED',
  'REPORT_GENERATED',
];

const SEVERITIES: EventSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export function SecurityEventsPage() {
  const [rows, setRows] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [eventType, setEventType] = useState<string>('');
  const [severity, setSeverity] = useState<string>('');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<SecurityEvent | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await securityEventsApi.list({
        page,
        limit: 25,
        eventType: (eventType || undefined) as EventType | undefined,
        severity: (severity || undefined) as EventSeverity | undefined,
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
  }, [page, eventType, severity]);

  if (loading && rows.length === 0) return <Spinner />;
  if (error) return <EmptyState title="Could not load events" description={error} />;

  return (
    <div>
      <PageHeader title="Security events" subtitle="Audit trail from the security subsystem." />
      <Card compact>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ minWidth: 200 }}>
            <Select label="Event type" value={eventType} onChange={(e) => setEventType(e.target.value)}>
              <option value="">All</option>
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>
          <div style={{ minWidth: 160 }}>
            <Select label="Severity" value={severity} onChange={(e) => setSeverity(e.target.value)}>
              <option value="">All</option>
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
          <Button variant="secondary" size="sm" type="button" onClick={() => void load()}>
            Refresh
          </Button>
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <Button variant="secondary" size="sm" type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Prev
          </Button>
          <span style={{ alignSelf: 'center', fontSize: 14, color: 'var(--color-text-muted)' }}>Page {page}</span>
          <Button variant="secondary" size="sm" type="button" onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      </Card>

      <div style={{ marginTop: 16 }}>
        <Card compact>
          <Table headers={['Time', 'Type', 'Severity', 'Description', '']}>
            {rows.map((r) => (
              <Tr key={r.id}>
                <Td>{new Date(r.createdAt).toLocaleString()}</Td>
                <Td>{r.eventType}</Td>
                <Td>{r.severity}</Td>
                <Td>{r.description}</Td>
                <Td>
                  <button type="button" className="text-link" onClick={() => setDetail(r)}>
                    Details
                  </button>
                </Td>
              </Tr>
            ))}
          </Table>
        </Card>
      </div>

      {detail ? (
        <Modal title={`Event #${detail.id}`} onClose={() => setDetail(null)}>
          <dl style={{ margin: 0, fontSize: 14 }}>
            <dt style={{ fontWeight: 600 }}>Type</dt>
            <dd style={{ margin: '4px 0 12px' }}>{detail.eventType}</dd>
            <dt style={{ fontWeight: 600 }}>Severity</dt>
            <dd style={{ margin: '4px 0 12px' }}>{detail.severity}</dd>
            <dt style={{ fontWeight: 600 }}>Description</dt>
            <dd style={{ margin: '4px 0 12px' }}>{detail.description}</dd>
            <dt style={{ fontWeight: 600 }}>User ID</dt>
            <dd style={{ margin: '4px 0 12px' }}>{detail.userId ?? '—'}</dd>
            <dt style={{ fontWeight: 600 }}>IP</dt>
            <dd style={{ margin: '4px 0 12px' }}>{detail.ipAddress ?? '—'}</dd>
            <dt style={{ fontWeight: 600 }}>Entity</dt>
            <dd style={{ margin: '4px 0 12px' }}>
              {detail.entityType ?? '—'} {detail.entityId ? `/ ${detail.entityId}` : ''}
            </dd>
          </dl>
        </Modal>
      ) : null}
    </div>
  );
}
