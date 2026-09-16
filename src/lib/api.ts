import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import type { ApiEnvelope, FieldError } from '@/types';
import { tokenStore, type Audience } from './storage';

const API_URL = import.meta.env.VITE_API_URL || '/api';

/** Error carrying the API's per-field messages so forms can show them inline. */
export class ApiError extends Error {
  status: number;
  fieldErrors: FieldError[];
  payload: unknown;

  constructor(message: string, status: number, fieldErrors: FieldError[] = [], payload?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.payload = payload;
  }
}

const toApiError = (error: unknown): ApiError => {
  if (error instanceof ApiError) return error;

  const axiosError = error as AxiosError<ApiEnvelope<unknown>>;
  const data = axiosError.response?.data;
  const fieldErrors = Array.isArray(data?.errors) ? data.errors : [];

  const message =
    data?.message ||
    (fieldErrors.length ? fieldErrors.map((entry) => entry.message).join('. ') : '') ||
    (axiosError.code === 'ERR_NETWORK'
      ? 'Cannot reach the server. Is the API running?'
      : axiosError.message) ||
    'Something went wrong';

  return new ApiError(message, axiosError.response?.status ?? 0, fieldErrors, data);
};

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

/** Callbacks the auth slices register so a failed refresh can clear state. */
const sessionExpiredHandlers: Record<Audience, (() => void) | null> = {
  customer: null,
  admin: null,
};

export const onSessionExpired = (audience: Audience, handler: () => void) => {
  sessionExpiredHandlers[audience] = handler;
};

const buildClient = (audience: Audience, refreshPath: string): AxiosInstance => {
  const client = axios.create({ baseURL: API_URL, withCredentials: true });

  client.interceptors.request.use((config) => {
    const token = tokenStore.getAccess(audience);
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  // A single in-flight refresh shared by every queued 401, so a burst of
  // parallel requests does not rotate the refresh token several times.
  let refreshing: Promise<string | null> | null = null;

  const refreshAccessToken = async (): Promise<string | null> => {
    if (!refreshing) {
      refreshing = axios
        .post<ApiEnvelope<{ accessToken: string; refreshToken: string }>>(
          `${API_URL}${refreshPath}`,
          { refreshToken: tokenStore.getRefresh(audience) },
          { withCredentials: true }
        )
        .then((response) => {
          const { accessToken, refreshToken } = response.data.data;
          tokenStore.set(audience, accessToken, refreshToken);
          return accessToken;
        })
        .catch(() => {
          tokenStore.clear(audience);
          sessionExpiredHandlers[audience]?.();
          return null;
        })
        .finally(() => {
          refreshing = null;
        });
    }
    return refreshing;
  };

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const config = error.config as RetriableConfig | undefined;
      const isAuthEndpoint = config?.url?.includes('/auth/');

      if (error.response?.status === 401 && config && !config._retried && !isAuthEndpoint) {
        config._retried = true;
        const token = await refreshAccessToken();

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          return client.request(config);
        }
      }

      return Promise.reject(toApiError(error));
    }
  );

  return client;
};

const customerClient = buildClient('customer', '/auth/refresh');
const adminClient = buildClient('admin', '/auth/admin/refresh');

const unwrap = async <T>(promise: Promise<{ data: ApiEnvelope<T> }>) => {
  try {
    const response = await promise;
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
};

/** Storefront requests (customer token). */
export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    unwrap<T>(customerClient.get(url, config)),
  post: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    unwrap<T>(customerClient.post(url, body, config)),
  patch: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    unwrap<T>(customerClient.patch(url, body, config)),
  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    unwrap<T>(customerClient.delete(url, config)),
  raw: customerClient,
};

/** Dashboard requests (admin token). */
export const adminApi = {
  get: <T>(url: string, config?: AxiosRequestConfig) => unwrap<T>(adminClient.get(url, config)),
  post: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    unwrap<T>(adminClient.post(url, body, config)),
  patch: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    unwrap<T>(adminClient.patch(url, body, config)),
  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    unwrap<T>(adminClient.delete(url, config)),
  raw: adminClient,
};

export const downloadFile = async (url: string, filename: string) => {
  const response = await adminClient.get(url, { responseType: 'blob' });
  const href = URL.createObjectURL(response.data as Blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
};

/** Trigger a browser download for the CSV export endpoints. */
export const downloadCsv = downloadFile;

export const getErrorMessage = (error: unknown) =>
  error instanceof ApiError ? error.message : (error as Error)?.message || 'Something went wrong';
