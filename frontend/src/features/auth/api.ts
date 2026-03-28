import { apiJsonRequest, refreshSessionRequest, setAuthSession } from '../../lib/api/client';
import type { JsonRequest, JsonResponse } from '../../lib/api/types';
import { useAuthStore } from '../../store/auth-store';

export type SessionResponse = JsonResponse<'/api/auth/login', 'post', 200>;
export type LoginBody = JsonRequest<'/api/auth/login', 'post'>;
export type RegisterBody = JsonRequest<'/api/auth/register', 'post'>;

export async function loginRequest(body: LoginBody): Promise<SessionResponse> {
  return apiJsonRequest<SessionResponse>({
    method: 'POST',
    path: '/api/auth/login',
    body,
    skipAuth: true,
    skipRefresh: true,
  });
}

export async function registerRequest(body: RegisterBody): Promise<SessionResponse> {
  return apiJsonRequest<SessionResponse>({
    method: 'POST',
    path: '/api/auth/register',
    body,
    skipAuth: true,
    skipRefresh: true,
  });
}

export async function restoreSessionRequest(): Promise<boolean> {
  return refreshSessionRequest();
}

export async function logoutRequest(): Promise<JsonResponse<'/api/auth/logout', 'post', 200>> {
  const result = await apiJsonRequest<JsonResponse<'/api/auth/logout', 'post', 200>>({
    method: 'POST',
    path: '/api/auth/logout',
    skipAuth: true,
    skipRefresh: true,
  });

  useAuthStore.getState().clearAuth();
  return result;
}

export function storeSession(session: SessionResponse): void {
  setAuthSession(session);
}
