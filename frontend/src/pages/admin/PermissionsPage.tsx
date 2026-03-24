import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { z } from 'zod';
import { permissionsApi } from '../../api/permissions.api';
import { usePermission } from '../../hooks/usePermission';
import type { Permission } from '../../types/domain';
import { getErrorMessage } from '../../shared/lib/errors';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { Input } from '../../shared/ui/Input';
import { Modal } from '../../shared/ui/Modal';
import { PageHeader } from '../../shared/ui/PageHeader';
import { Spinner } from '../../shared/ui/Spinner';
import { EmptyState } from '../../shared/ui/EmptyState';
import { Table, Td, Tr } from '../../shared/ui/Table';

const schema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function PermissionsPage() {
  const { can } = usePermission();
  const [items, setItems] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [edit, setEdit] = useState<Permission | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await permissionsApi.list();
      setItems(data);
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
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const {
    register: regEdit,
    handleSubmit: submitEdit,
    reset: resetEdit,
    formState: { errors: errEdit, isSubmitting: submittingEdit },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (edit) {
      resetEdit({
        code: edit.code,
        name: edit.name,
        description: edit.description ?? '',
      });
    }
  }, [edit, resetEdit]);

  const onCreate = async (values: FormValues) => {
    try {
      await permissionsApi.create(values);
      toast.success('Permission created');
      setCreateOpen(false);
      reset();
      await load();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const onSave = async (values: FormValues) => {
    if (!edit) return;
    try {
      await permissionsApi.update(edit.id, values);
      toast.success('Permission updated');
      setEdit(null);
      await load();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const onDelete = async (p: Permission) => {
    if (!window.confirm(`Delete permission ${p.code}?`)) return;
    try {
      await permissionsApi.remove(p.id);
      toast.success('Permission deleted');
      await load();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  if (loading) return <Spinner />;
  if (error) return <EmptyState title="Failed to load permissions" description={error} />;

  return (
    <div>
      <PageHeader
        title="Permissions"
        subtitle="Catalog of access rights used in RBAC."
        actions={
          can('permission.manage') ? (
            <Button type="button" onClick={() => setCreateOpen(true)}>
              Create permission
            </Button>
          ) : null
        }
      />

      <Card compact>
        <Table headers={['Code', 'Name', 'Description', 'Actions']}>
          {items.map((p) => (
            <Tr key={p.id}>
              <Td>
                <code>{p.code}</code>
              </Td>
              <Td>{p.name}</Td>
              <Td>{p.description ?? '—'}</Td>
              <Td>
                {can('permission.manage') ? (
                  <>
                    <button type="button" className="text-link" onClick={() => setEdit(p)}>
                      Edit
                    </button>
                    {' · '}
                    <button type="button" className="text-link" onClick={() => void onDelete(p)}>
                      Delete
                    </button>
                  </>
                ) : (
                  '—'
                )}
              </Td>
            </Tr>
          ))}
        </Table>
      </Card>

      {createOpen ? (
        <Modal title="Create permission" onClose={() => setCreateOpen(false)} footer={null}>
          <form onSubmit={handleSubmit(onCreate)}>
            <Input label="Code" {...register('code')} error={errors.code?.message} />
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

      {edit ? (
        <Modal title="Edit permission" onClose={() => setEdit(null)} footer={null}>
          <form onSubmit={submitEdit(onSave)}>
            <Input label="Code" {...regEdit('code')} error={errEdit.code?.message} />
            <Input label="Name" {...regEdit('name')} error={errEdit.name?.message} />
            <Input label="Description" {...regEdit('description')} error={errEdit.description?.message} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="secondary" type="button" onClick={() => setEdit(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submittingEdit}>
                Save
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
