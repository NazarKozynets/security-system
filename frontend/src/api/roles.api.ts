import type { Role } from '../types/domain';
import { http } from './http';

export interface RoleBody {
  name: string;
  description?: string;
}

export const rolesApi = {
  list: () => http.get<Role[]>('/roles').then((r) => r.data),
  create: (body: RoleBody) => http.post<Role>('/roles', body).then((r) => r.data),
  update: (id: number, body: RoleBody) => http.patch<Role>(`/roles/${id}`, body).then((r) => r.data),
  remove: (id: number) => http.delete(`/roles/${id}`).then((r) => r.data),
  assignPermissions: (id: number, permissionIds: number[]) =>
    http.post<Role[]>(`/roles/${id}/permissions`, { permissionIds }).then((r) => r.data),
  removePermission: (roleId: number, permissionId: number) =>
    http.delete(`/roles/${roleId}/permissions/${permissionId}`).then((r) => r.data),
};
