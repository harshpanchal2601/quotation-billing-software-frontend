import { apiClient, type ApiSuccessResponse } from '@shared/api/apiClient';
import type { CreateFirmInput, FirmStatus, PlatformFirm } from './platform.types';

type FirmListResponse = {
  firms: PlatformFirm[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export const platformFirmQueryKey = ['platform', 'firms'] as const;

export type FirmListParams = { page?: number; limit?: number; search?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' };

export async function listPlatformFirmsRequest(params: FirmListParams = {}, signal?: AbortSignal) {
  const response = await apiClient.get<ApiSuccessResponse<FirmListResponse>>('/platform/firms', {
    params: { page: 1, limit: 20, ...params }, signal,
  });
  return response.data.data;
}

export async function createPlatformFirmRequest(input: CreateFirmInput) {
  const response = await apiClient.post<ApiSuccessResponse<{ firm: PlatformFirm }>>('/platform/firms', input);
  return response.data.data.firm;
}

export async function updatePlatformFirmStatusRequest(id: number, status: FirmStatus) {
  const response = await apiClient.patch<ApiSuccessResponse<{ firm: PlatformFirm }>>(
    `/platform/firms/${id}/status`,
    { status },
  );
  return response.data.data.firm;
}

export async function updatePlatformFirmRequest(id: number, input: { name: string; slug: string }) {
  const response = await apiClient.put<ApiSuccessResponse<{ firm: PlatformFirm }>>(`/platform/firms/${id}`, input);
  return response.data.data.firm;
}

export async function resetPlatformFirmAdministratorPasswordRequest(id: number, temporaryPassword: string) {
  await apiClient.post(`/platform/firms/${id}/administrator/reset-password`, { temporaryPassword });
}
