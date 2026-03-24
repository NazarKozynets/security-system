import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { z } from 'zod';
import { usersApi } from '../../api/users.api';
import { usePermission } from '../../hooks/usePermission';
import type { User, UserStatus } from '../../types/domain';
import { getErrorMessage } from '../../shared/lib/errors';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { Input } from '../../shared/ui/Input';
import { Modal } from '../../shared/ui/Modal';
import { PageHeader } from '../../shared/ui/PageHeader';
import { Select } from '../../shared/ui/Select';
import { Spinner } from '../../shared/ui/Spinner';
import { StatusBadge } from '../../shared/ui/Badge';
import { EmptyState } from '../../shared/ui/EmptyState';
import { Table, Td, Tr } from '../../shared/ui/Table';
import styles from './UsersPage.module.css';

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  status: z.enum(['ACTIVE', 'BLOCKED', 'DISABLED']).optional(),
});

type CreateForm = z.infer<typeof createSchema>;

export function UsersPage() {
  const { can } = usePermission();
  const [users, setUsers] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [statusUser, setStatusUser] = useState<User | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await usersApi.list(page, 20);
      setUsers(data);
      setError('');
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [page]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateForm>({ resolver: zodResolver(createSchema) });

  const onCreate = async (values: CreateForm) => {
    try {
      await usersApi.create(values);
      toast.success('User created');
      setCreateOpen(false);
      reset();
      await load();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const onStatusChange = async (status: UserStatus) => {
    if (!statusUser) return;
    try {
      await usersApi.updateStatus(statusUser.id, status);
      toast.success('Status updated');
      setStatusUser(null);
      await load();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  if (loading && users.length === 0) return <Spinner />;
  if (error) return <EmptyState title="Failed to load users" description={error} />;

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Directory of accounts and access status."
        actions={
          can('user.create') ? (
            <Button type="button" onClick={() => setCreateOpen(true)}>
              Create user
            </Button>
          ) : null
        }
      />

      <div className={styles.toolbar}>
        <Button variant="secondary" size="sm" type="button" onClick={() => void load()}>
          Refresh
        </Button>
        <span className={styles.pageInfo}>Page {page}</span>
        <Button
          variant="secondary"
          size="sm"
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Previous
        </Button>
        <Button variant="secondary" size="sm" type="button" onClick={() => setPage((p) => p + 1)}>
          Next
        </Button>
      </div>

      <Card compact>
        <Table headers={['Name', 'Email', 'Status', 'Roles', 'Actions']}>
          {users.map((u) => (
            <Tr key={u.id}>
              <Td>
                {u.firstName} {u.lastName}
              </Td>
              <Td>{u.email}</Td>
              <Td>
                <StatusBadge status={u.status} />
              </Td>
              <Td>{u.roles.join(', ') || '—'}</Td>
              <Td>
                <Link to={`/admin/users/${u.id}`} className={styles.link}>
                  View
                </Link>
                {can('user.update') ? (
                  <>
                    {' · '}
                    <button
                      type="button"
                      className={styles.linkBtn}
                      onClick={() => setStatusUser(u)}
                    >
                      Status
                    </button>
                  </>
                ) : null}
              </Td>
            </Tr>
          ))}
        </Table>
      </Card>

      {createOpen ? (
        <Modal title="Create user" onClose={() => setCreateOpen(false)} footer={null}>
          <form onSubmit={handleSubmit(onCreate)}>
            <Input label="Email" {...register('email')} error={errors.email?.message} />
            <Input
              label="Password"
              type="password"
              {...register('password')}
              error={errors.password?.message}
            />
            <Input label="First name" {...register('firstName')} error={errors.firstName?.message} />
            <Input label="Last name" {...register('lastName')} error={errors.lastName?.message} />
            <Select label="Status" {...register('status')}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="BLOCKED">BLOCKED</option>
              <option value="DISABLED">DISABLED</option>
            </Select>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="secondary" type="button" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                Create
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}

      {statusUser ? (
        <Modal title={`Change status: ${statusUser.email}`} onClose={() => setStatusUser(null)}>
          <p style={{ marginTop: 0, fontSize: 14 }}>Current: {statusUser.status}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(['ACTIVE', 'BLOCKED', 'DISABLED'] as UserStatus[]).map((s) => (
              <Button key={s} variant="secondary" type="button" onClick={() => onStatusChange(s)}>
                Set {s}
              </Button>
            ))}
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
