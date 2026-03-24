import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { toast } from 'react-toastify';
import { notifyUnauthorized } from '../shared/lib/authEvents';
import { getErrorMessage } from '../shared/lib/errors';
import { tokenStorage } from '../utils/storage';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

let isHandling401 = false;

export const http = axios.create({
  baseURL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

http.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenStorage.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

http.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    const status = error.response?.status;
    const url = error.config?.url ?? '';

    const isAuthPublic = url.includes('/auth/login') || url.includes('/auth/register');

    if (status === 401 && !isAuthPublic) {
      if (!isHandling401) {
        isHandling401 = true;
        toast.error('Session expired. Please sign in again.');
        notifyUnauthorized();
        setTimeout(() => {
          isHandling401 = false;
        }, 1500);
      }
    } else if (status === 403 && !isAuthPublic) {
      toast.error('You do not have permission for this action.');
    } else if (status === 404 && !isAuthPublic) {
      toast.error(getErrorMessage(error, 'Resource not found'));
    } else if (status && status >= 500 && !isAuthPublic) {
      toast.error('Server error. Please try again later.');
    } else if (!error.response && error.message === 'Network Error') {
      toast.error('Network error. Check your connection and API URL.');
    }

    return Promise.reject(error);
  },
);
