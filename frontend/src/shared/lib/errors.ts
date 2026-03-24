import type { AxiosError } from 'axios';

interface NestErrorBody {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (!error) return fallback;
  const ax = error as AxiosError<NestErrorBody>;
  const data = ax.response?.data;
  if (data?.message) {
    return Array.isArray(data.message) ? data.message.join(', ') : data.message;
  }
  if (ax.message) return ax.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

export function isAxiosError(error: unknown): error is AxiosError {
  return typeof error === 'object' && error !== null && 'isAxiosError' in error;
}
