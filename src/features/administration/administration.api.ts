import { apiClient, type ApiSuccessResponse } from '@shared/api/apiClient';
import type { Permission } from '@features/auth';
import type { FirmRole, FirmUser, RoleInput, UserCreateInput } from './administration.types';

export const administrationQueryKeys = {
  roles: ['administration', 'roles'] as const,
  permissions: ['administration', 'permissions'] as const,
  users: ['administration', 'users'] as const,
};

export async function listRolesRequest() {
  const response = await apiClient.get<ApiSuccessResponse<{ roles: FirmRole[] }>>('/administration/roles');
  return response.data.data.roles;
}

export async function listAssignablePermissionsRequest() {
  const response = await apiClient.get<ApiSuccessResponse<{ permissions: Permission[] }>>('/administration/permissions');
  return response.data.data.permissions;
}

export async function createRoleRequest(input: RoleInput) {
  const response = await apiClient.post<ApiSuccessResponse<{ role: FirmRole }>>('/administration/roles', input);
  return response.data.data.role;
}

export async function updateRoleRequest(id: number, input: RoleInput) {
  const response = await apiClient.put<ApiSuccessResponse<{ role: FirmRole }>>(`/administration/roles/${id}`, input);
  return response.data.data.role;
}

export async function deleteRoleRequest(id: number) {
  await apiClient.delete(`/administration/roles/${id}`);
}

export async function listFirmUsersRequest() {
  const response = await apiClient.get<ApiSuccessResponse<{
    users: FirmUser[];
    userLimit: number;
    userCount: number;
  }>>('/administration/users');
  return response.data.data;
}

export async function createFirmUserRequest(input: UserCreateInput) {
  const response = await apiClient.post<ApiSuccessResponse<{ user: FirmUser }>>('/administration/users', input);
  return response.data.data.user;
}

export async function updateFirmUserRequest(
  id: number,
  input: Partial<Pick<FirmUser, 'name' | 'email' | 'username' | 'status'>> & { roleId?: number },
) {
  const response = await apiClient.put<ApiSuccessResponse<{ user: FirmUser }>>(`/administration/users/${id}`, input);
  return response.data.data.user;
}

export async function resetFirmUserPasswordRequest(id: number, temporaryPassword: string) {
  await apiClient.post(`/administration/users/${id}/reset-password`, { temporaryPassword });
}

export async function deleteFirmUserRequest(id: number) {
  await apiClient.delete(`/administration/users/${id}`);
}
