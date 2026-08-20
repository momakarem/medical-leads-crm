import type { CurrentUser } from '../../../types';
import { apiRequest } from '../../../services/apiClient';

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: CurrentUser;
}

export function login(request: LoginRequest): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: request.email, password: request.password }),
  });
}

export function logout(): Promise<{ success: true }> {
  return apiRequest<{ success: true }>('/auth/logout', { method: 'POST' });
}

export async function getCurrentUser(signal?: AbortSignal): Promise<CurrentUser> {
  const response = await apiRequest<CurrentUser | { user: CurrentUser }>('/auth/me', { signal });
  return 'user' in response ? response.user : response;
}

