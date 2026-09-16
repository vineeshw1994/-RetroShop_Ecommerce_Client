import { api, adminApi } from '@/lib/api';
import type { AdminUser, GuestBasketEntry, PermissionModule, User } from '@/types';

export interface SignupPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  marketingOptIn?: boolean;
  turnstileToken?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  turnstileToken?: string;
  guestBasket?: GuestBasketEntry[];
}

export interface SessionPayload {
  user: User;
  accessToken: string;
  refreshToken: string;
  admin?: AdminUser;
  adminAccessToken?: string;
  adminRefreshToken?: string;
  permissionModules?: PermissionModule[];
}

export interface AdminSessionPayload {
  admin: AdminUser;
  accessToken: string;
  refreshToken: string;
  permissionModules: PermissionModule[];
}

export const authService = {
  signup: (payload: SignupPayload) =>
    api.post<{ email: string; requiresVerification: boolean; devOtp?: string }>(
      '/auth/signup',
      payload
    ),

  verifyEmail: (payload: { email: string; code: string; guestBasket?: GuestBasketEntry[] }) =>
    api.post<SessionPayload>('/auth/verify-email', payload),

  resendCode: (email: string) =>
    api.post<{ expiresInMinutes?: number; devOtp?: string }>('/auth/resend-code', { email }),

  login: (payload: LoginPayload) => api.post<SessionPayload>('/auth/login', payload),

  forgotPassword: (payload: { email: string; turnstileToken?: string }) =>
    api.post<{ devOtp?: string }>('/auth/forgot-password', payload),

  resetPassword: (payload: {
    email: string;
    code: string;
    password: string;
    confirmPassword: string;
  }) => api.post<null>('/auth/reset-password', payload),

  logout: () => api.post<null>('/auth/logout'),

  me: () => api.get<{ user: User }>('/auth/me'),
};

export const adminAuthService = {
  login: (payload: { email: string; password: string; turnstileToken?: string }) =>
    adminApi.post<AdminSessionPayload>('/auth/admin/login', payload),

  forgotPassword: (payload: { email: string; turnstileToken?: string }) =>
    adminApi.post<null>('/auth/admin/forgot-password', payload),

  resetPassword: (payload: {
    email: string;
    code: string;
    password: string;
    confirmPassword: string;
  }) => adminApi.post<null>('/auth/admin/reset-password', payload),

  logout: () => adminApi.post<null>('/auth/admin/logout'),

  me: () =>
    adminApi.get<{ admin: AdminUser; permissionModules: PermissionModule[] }>('/auth/admin/me'),
};
