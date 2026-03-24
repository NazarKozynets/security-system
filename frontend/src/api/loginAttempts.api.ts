import type { LoginAttempt } from '../types/domain';
import { http } from './http';

export const loginAttemptsApi = {
  list: (page = 1, limit = 50) =>
    http
      .get<LoginAttempt[]>('/login-attempts', { params: { page, limit } })
      .then((r) => r.data),
  get: (id: number) => http.get<LoginAttempt>(`/login-attempts/${id}`).then((r) => r.data),
};
