import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { z } from 'zod';
import { permissionsApi } from '../../api/permissions.api';
import { rolesApi } from '../../api/roles.api';
import { usePermission } from '../../hooks/usePermission';
import type { Permission, Role } from '../../types/domain';
import { getErrorMessage } from '../../shared/lib/errors';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { Input } from '../../shared/ui/Input';
import { Modal } from '../../shared/ui/Modal';
import { PageHeader } from '../../shared/ui/PageHeader';
import { Spinner } from '../../shared/ui/Spinner';
import { EmptyState } from '../../shared/ui/EmptyState';
import { Table, Td, Tr } from '../../shared/ui/Table';

const roleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

type RoleForm = z.infer<typeof roleSchema>;

export function RolesPage() {
  const { can } = usePermission();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [permRole, setPermRole] = useState<Role | null>(null);
  const [selectedPerm, setSelectedPerm] = useState<number[]>([]);

  const load = async () => {
    try {
      setLoading(true);
      const [r, p] = await Promise.all([rolesApi.list(), permissionsApi.list()]);
      setRoles(r);
      setPermissions(p);
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

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RoleForm>({ resolver: zodResolver(roleSchema) });

  const {
    register: registerEdit,
    handleSubmit: handleEdit,
    reset: resetEdit,
    formState: { errors: editErrors, isSubmitting: editSubmitting },
  } = useForm<RoleForm>({ resolver: zodResolver(roleSchema) });

  useEffect(() => {
    if (editRole) {
      resetEdit({ name: editRole.name, description: editRole.description ?? '' });
    }
  }, [editRole, resetEdit]);

  const onCreate = async (values: RoleForm) => {
    try {
      await rolesApi.create(values);
      toast.success('Role created');
      setCreateOpen(false);
      reset();
      await load();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const onUpdate = async (values: RoleForm) => {
    if (!editRole) return;
    try {
      await rolesApi.update(editRole.id, values);
      toast.success('Role updated');
      setEditRole(null);
      await load();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const onDelete = async (role: Role) => {
    if (!window.confirm(`Delete role ${role.name}?`)) return;
    try {
      await rolesApi.remove(role.id);
      toast.success('Role deleted');
      await load();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const openPerms = (role: Role) => {
    setPermRole(role);
    setSelectedPerm([]);
  };

  const assignPerms = async () => {
    if (!permRole || selectedPerm.length === 0) return;
    try {
      await rolesApi.assignPermissions(permRole.id, selectedPerm);
      toast.success('Permissions assigned');
      setPermRole(null);
      await load();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const removePerm = async (roleId: number, permissionId: number) => {
    if (!window.confirm('Remove this permission from the role?')) return;
    try {
      await rolesApi.removePermission(roleId, permissionId);
      toast.success('Permission removed');
      await load();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  if (loading) return <Spinner />;
  if (error) return <EmptyState title="Failed to load roles" description={error} />;

  return (
    <div>
      <PageHeader
        title="Roles"
        subtitle="Role definitions and permission bindings."
        actions={
          can('role.manage') ? (
            <Button type="button" onClick={() => setCreateOpen(true)}>
              Create role
            </Button>
          ) : null
        }
      />

      <Card compact>
        <Table headers={['Name', 'Description', 'Permissions', 'Actions']}>
          {roles.map((r) => (
            <Tr key={r.id}>
              <Td>{r.name}</Td>
              <Td>{r.description ?? '—'}</Td>
              <Td>
                {(r.rolePermissions ?? [])
                  .map((rp) => rp.permission.code)
                  .slice(0, 6)
                  .join(', ') || '—'}
                {(r.rolePermissions?.length ?? 0) > 6 ? '…' : ''}
              </Td>
              <Td style={{ whiteSpace: 'nowrap' }}>
                {can('permission.manage') ? (
                  <button type="button" className="text-link" onClick={() => openPerms(r)}>
                    Permissions
                  </button>
                ) : null}
                {can('role.manage') ? (
                  <>
                    {' · '}
                    <button type="button" className="text-link" onClick={() => setEditRole(r)}>
 Edit
                    </button>
                    {' · '}
                    <button type="button" className="text-link" onClick={() => void onDelete(r)}>
 Delete
                    </button>
                  </>
                ) : null}
              </Td>
            </Tr>
          ))}
        </Table>
      </Card>

      {createOpen ? (
        <Modal title="Create role" onClose={() => setCreateOpen(false)} footer={null}>
          <form onSubmit={handleSubmit(onCreate)}>
            <Input label="Name" {...register('name')} error={errors.name?.message} />
            <Input label="Description" {...register('description')} error={errors.description?.message} />
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

      {editRole ? (
        <Modal title="Edit role" onClose={() => setEditRole(null)} footer={null}>
          <form onSubmit={handleEdit(onUpdate)}>
            <Input label="Name" {...registerEdit('name')} error={editErrors.name?.message} />
            <Input
              label="Description"
              {...registerEdit('description')}
              error={editErrors.description?.message}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="secondary" type="button" onClick={() => setEditRole(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={editSubmitting}>
                Save
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}

      {permRole ? (
        <Modal title={`Permissions: ${permRole.name}`} onClose={() => setPermRole(null)} footer={null}>
          <p style={{ marginTop: 0, fontSize: 14 }}>Assign additional permissions:</p>
          <div style={{ maxHeight: 240, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {permissions.map((p) => (
              <label key={p.id} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
                <input
                  type="checkbox"
                  checked={selectedPerm.includes(p.id)}
                  onChange={(e) =>
                    setSelectedPerm((prev) =>
                      e.target.checked ? [...prev, p.id] : prev.filter((x) => x !== p.id),
                    )
                  }
                />
                <span>
                  {p.code} — {p.name}
                </span>
              </label>
            ))}
          </div>
          <h4 style={{ marginBottom: 8 }}>Current</h4>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>
            {(permRole.rolePermissions ?? []).map((rp) => (
              <li key={rp.permissionId} style={{ marginBottom: 6 }}>
                {rp.permission.code}{' '}
                <button
                  type="button"
                  style={{ border: 'none', background: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}
                  onClick={() => void removePerm(permRole.id, rp.permissionId)}
                >
                  remove
                </button>
              </li>
            ))}
          </ul>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
            <Button variant="secondary" type="button" onClick={() => setPermRole(null)}>
              Close
            </Button>
            <Button type="button" onClick={() => void assignPerms()}>
              Assign selected
            </Button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
