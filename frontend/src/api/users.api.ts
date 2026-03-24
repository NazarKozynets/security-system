import type { User, UserStatus } from '../types/domain';
import { http } from './http';

export interface CreateUserBody {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  status?: UserStatus;
  roleIds?: number[];
}

export type UpdateUserBody = Partial<CreateUserBody>;

export const usersApi = {
  list: (page = 1, limit = 20) =>
    http.get<User[]>('/users', { params: { page, limit } }).then((r) => r.data),
  get: (id: number) => http.get<User>(`/users/${id}`).then((r) => r.data),
  create: (body: CreateUserBody) => http.post<User>('/users', body).then((r) => r.data),
  update: (id: number, body: UpdateUserBody) =>
    http.patch<User>(`/users/${id}`, body).then((r) => r.data),
  updateStatus: (id: number, status: UserStatus) =>
    http.patch<User>(`/users/${id}/status`, { status }).then((r) => r.data),
  disable: (id: number) => http.delete<User>(`/users/${id}`).then((r) => r.data),
  assignRoles: (id: number, roleIds: number[]) =>
    http.post<User>(`/users/${id}/roles`, { roleIds }).then((r) => r.data),
  removeRole: (userId: number, roleId: number) =>
    http.delete(`/users/${userId}/roles/${roleId}`).then((r) => r.data),
};
