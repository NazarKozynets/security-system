import type { AuthResponse, AuthUser } from '../types/domain';
import { http } from './http';

export interface LoginBody {
  email: string;
  password: string;
}

export interface RegisterBody extends LoginBody {
  firstName: string;
  lastName: string;
}

export const authApi = {
  login: (body: LoginBody) => http.post<AuthResponse>('/auth/login', body).then((r) => r.data),
  register: (body: RegisterBody) => http.post<AuthResponse>('/auth/register', body).then((r) => r.data),
  me: () => http.get<AuthUser>('/auth/me').then((r) => r.data),
  logout: (refreshToken: string) =>
    http.post('/auth/logout', { refreshToken }).then((r) => r.data),
};
