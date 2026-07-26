import { apiClient, createSkipAuthRefreshConfig, type ApiSuccessResponse } from '../../services/apiClient';
import type { AuthUserResponse, ChangePasswordInput, LoginInput } from './auth.types';

export const authQueryKey = ['auth', 'me'] as const;

export async function loginRequest(input: LoginInput) {
  const response = await apiClient.post<ApiSuccessResponse<AuthUserResponse>>(
    '/auth/login',
    input,
    createSkipAuthRefreshConfig(),
  );
  return response.data.data.user;
}

export async function getCurrentUserRequest() {
  const response = await apiClient.get<ApiSuccessResponse<AuthUserResponse>>('/auth/me');
  return response.data.data.user;
}

export async function logoutRequest() {
  await apiClient.post('/auth/logout', undefined, createSkipAuthRefreshConfig());
}

export async function changePasswordRequest(input: ChangePasswordInput) {
  await apiClient.post('/auth/change-password', input);
}
