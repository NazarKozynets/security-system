import type { Permission } from '../types/domain';
import { http } from './http';

export interface PermissionBody {
  code: string;
  name: string;
  description?: string;
}

export const permissionsApi = {
  list: () => http.get<Permission[]>('/permissions').then((r) => r.data),
  create: (body: PermissionBody) =>
    http.post<Permission>('/permissions', body).then((r) => r.data),
  update: (id: number, body: PermissionBody) =>
    http.patch<Permission>(`/permissions/${id}`, body).then((r) => r.data),
  remove: (id: number) => http.delete(`/permissions/${id}`).then((r) => r.data),
};
