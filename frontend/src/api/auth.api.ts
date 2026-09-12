import { apiRequest } from './client';
import type { AuthSessionResponse, LogoutResponse, MeResponse } from '../types/api';

export interface LoginInput {
  email: string;
  password: string;
}

export const authApi = {
  login(input: LoginInput): Promise<AuthSessionResponse> {
    return apiRequest<AuthSessionResponse>('/api/auth/login', {
      method: 'POST',
      body: input,
      skipAuth: true,
    });
  },

  refresh(): Promise<AuthSessionResponse> {
    return apiRequest<AuthSessionResponse>('/api/auth/refresh', {
      method: 'POST',
      skipAuth: true,
    });
  },

  logout(): Promise<LogoutResponse> {
    return apiRequest<LogoutResponse>('/api/auth/logout', {
      method: 'POST',
      skipAuth: true,
    });
  },

  me(): Promise<MeResponse> {
    return apiRequest<MeResponse>('/api/auth/me');
  },
};
