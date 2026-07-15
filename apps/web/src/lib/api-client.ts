import axios, { AxiosError } from 'axios';

import { useAuthStore } from '../stores/auth-store';

import type { AuthSessionDto } from '@nexops/shared';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

export const apiClient = axios.create({
  baseURL: apiUrl,
  timeout: 15_000,
  withCredentials: true,
});

const retriedRequests = new WeakSet<object>();
let renewal: Promise<AuthSessionDto> | null = null;

apiClient.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().accessToken;
  if (accessToken) config.headers.set('Authorization', `Bearer ${accessToken}`);
  return config;
});

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta: Record<string, unknown>;
}

export async function renewSession(): Promise<AuthSessionDto> {
  renewal ??= axios
    .post<ApiSuccess<AuthSessionDto>>(
      `${apiUrl}/auth/refresh`,
      {},
      { withCredentials: true, timeout: 15_000 },
    )
    .then((response) => response.data.data)
    .finally(() => {
      renewal = null;
    });
  return renewal;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!(error instanceof AxiosError) || error.response?.status !== 401 || !error.config) {
      return Promise.reject(
        error instanceof Error ? error : new Error('API request failed', { cause: error }),
      );
    }
    const request = error.config;
    const isAuthenticationRequest = request.url?.includes('/auth/') ?? false;
    if (isAuthenticationRequest || retriedRequests.has(request)) {
      return Promise.reject(error);
    }

    retriedRequests.add(request);
    try {
      const session = await renewSession();
      useAuthStore.getState().setSession(session);
      request.headers.set('Authorization', `Bearer ${session.accessToken}`);
      return await apiClient.request(request);
    } catch (renewalError) {
      useAuthStore.getState().clearSession();
      return Promise.reject(
        renewalError instanceof Error
          ? renewalError
          : new Error('Session renewal failed', { cause: renewalError }),
      );
    }
  },
);

interface ApiFailure {
  success: false;
  error: { code: string; message: string; details: Array<{ path?: string; message: string }> };
  requestId: string;
}

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const payload = error.response?.data as ApiFailure | undefined;
    if (payload?.success === false) return payload.error.message;
    if (error.code === 'ECONNABORTED') return 'The request timed out. Please try again.';
  }
  return 'Something went wrong. Please try again.';
}
