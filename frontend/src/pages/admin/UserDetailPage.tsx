import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { loginAttemptsApi } from '../../api/loginAttempts.api';
import { rolesApi } from '../../api/roles.api';
import { securityEventsApi } from '../../api/securityEvents.api';
import { usersApi } from '../../api/users.api';
import { usePermission } from '../../hooks/usePermission';
import type { LoginAttempt, Role, SecurityEvent, User } from '../../types/domain';
import { getErrorMessage } from '../../shared/lib/errors';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { EmptyState } from '../../shared/ui/EmptyState';
import { PageHeader } from '../../shared/ui/PageHeader';
import { Spinner } from '../../shared/ui/Spinner';
import { Table, Td, Tr } from '../../shared/ui/Table';
import { Modal } from '../../shared/ui/Modal';

export function UserDetailPage() {
  const { id } = useParams();
  const userId = Number(id);
  const { can } = usePermission();

  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [attempts, setAttempts] = useState<LoginAttempt[]>([]);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<number[]>([]);

  const roleNameToId = useMemo(() => {
    const m = new Map<string, number>();
    roles.forEach((r) => m.set(r.name, r.id));
    return m;
  }, [roles]);

  const load = async () => {
    if (!userId || Number.isNaN(userId)) return;
    try {
      setLoading(true);
      const [u, allRoles, la, ev] = await Promise.all([
        usersApi.get(userId),
        rolesApi.list(),
        loginAttemptsApi.list(1, 100),
        securityEventsApi.list({ page: 1, limit: 100 }),
      ]);
      setUser(u);
      setRoles(allRoles);
      setAttempts(la.filter((a) => a.userId === userId || a.email === u.email).slice(0, 15));
      setEvents(ev.filter((e) => e.userId === userId).slice(0, 15));
      setError('');
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [userId]);

  const assignRoles = async () => {
    if (!user || selectedRoles.length === 0) return;
    try {
      await usersApi.assignRoles(user.id, selectedRoles);
      toast.success('Roles assigned');
      setAssignOpen(false);
      setSelectedRoles([]);
      await load();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const removeRole = async (roleName: string) => {
    const rid = roleNameToId.get(roleName);
    if (!user || !rid) return;
    if (!window.confirm(`Remove role ${roleName} from this user?`)) return;
    try {
      await usersApi.removeRole(user.id, rid);
      toast.success('Role removed');
      await load();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  if (loading) return <Spinner />;
  if (error || !user) return <EmptyState title="User not found" description={error} />;

  return (
    <div>
      <PageHeader
        title={`${user.firstName} ${user.lastName}`}
        subtitle={user.email}
        actions={
          <>
            <Link to="/admin/users" style={{ fontWeight: 600, alignSelf: 'center' }}>
              ← Users
            </Link>
            <Link to={`/admin/user-access/${user.id}`}>
              <Button variant="secondary" type="button">
                Access overview
              </Button>
            </Link>
            {can('role.assign') ? (
              <Button type="button" onClick={() => setAssignOpen(true)}>
                Assign roles
              </Button>
            ) : null}
          </>
        }
      />

      <div style={{ display: 'grid', gap: 16 }}>
        <Card compact>
          <h3 style={{ marginTop: 0 }}>Profile</h3>
          <p style={{ margin: '4px 0' }}>
            <strong>Status:</strong> {user.status}
          </p>
          <p style={{ margin: '4px 0' }}>
            <strong>Roles:</strong>{' '}
            {user.roles.map((r) => (
              <span key={r} style={{ marginRight: 8 }}>
                <Badge tone="info">{r}</Badge>
                {can('role.assign') ? (
                  <button
                    type="button"
                    onClick={() => void removeRole(r)}
                    style={{
                      marginLeft: 4,
                      border: 'none',
                      background: 'none',
                      color: 'var(--color-danger)',
                      cursor: 'pointer',
                      fontSize: 12,
                    }}
                    title="Remove role"
                  >
                    ×
                  </button>
                ) : null}
              </span>
            ))}
          </p>
          {user.permissions?.length ? (
            <div>
              <strong>Permissions:</strong>
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {user.permissions.map((p) => (
                  <Badge key={p} tone="neutral">
                    {p}
                  </Badge>
                ))}
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--color-text-muted)' }}>No derived permissions.</p>
          )}
        </Card>

        <Card compact>
          <h3 style={{ marginTop: 0 }}>Recent login attempts</h3>
          {attempts.length === 0 ? (
            <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>None loaded.</p>
          ) : (
            <Table headers={['At', 'Success', 'IP', 'Reason']}>
              {attempts.map((a) => (
                <Tr key={a.id}>
                  <Td>{new Date(a.attemptedAt).toLocaleString()}</Td>
                  <Td>{a.success ? 'Yes' : 'No'}</Td>
                  <Td>{a.ipAddress ?? '—'}</Td>
                  <Td>{a.failureReason ?? '—'}</Td>
                </Tr>
              ))}
            </Table>
          )}
        </Card>

        <Card compact>
          <h3 style={{ marginTop: 0 }}>Recent security events</h3>
          {events.length === 0 ? (
            <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>None loaded.</p>
          ) : (
            <Table headers={['At', 'Type', 'Severity', 'Description']}>
              {events.map((ev) => (
                <Tr key={ev.id}>
                  <Td>{new Date(ev.createdAt).toLocaleString()}</Td>
                  <Td>{ev.eventType}</Td>
                  <Td>{ev.severity}</Td>
                  <Td>{ev.description}</Td>
                </Tr>
              ))}
            </Table>
          )}
        </Card>
      </div>

      {assignOpen ? (
        <Modal title="Assign roles" onClose={() => setAssignOpen(false)} footer={null}>
          <p style={{ marginTop: 0, fontSize: 14 }}>Select one or more roles to add.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflow: 'auto' }}>
            {roles.map((r) => (
              <label key={r.id} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
                <input
                  type="checkbox"
                  checked={selectedRoles.includes(r.id)}
                  onChange={(e) => {
                    setSelectedRoles((prev) =>
                      e.target.checked ? [...prev, r.id] : prev.filter((x) => x !== r.id),
                    );
                  }}
                />
                {r.name}
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
            <Button variant="secondary" type="button" onClick={() => setAssignOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void assignRoles()}>
              Assign
            </Button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
