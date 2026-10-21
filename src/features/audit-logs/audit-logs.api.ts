import { apiClient, type ApiSuccessResponse } from '@shared/api/apiClient';

export type AuditLog = {
  id: number;
  entityType: string;
  entityId: string;
  action: string;
  oldValues: unknown;
  newValues: unknown;
  ipAddress: string | null;
  createdAt: string;
  user: { id: number; name: string; email: string } | null;
};

type AuditLogResponse = {
  auditLogs: AuditLog[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export async function listAuditLogsRequest(page: number, limit: number) {
  const response = await apiClient.get<ApiSuccessResponse<AuditLogResponse>>('/audit-logs', {
    params: { page, limit },
  });
  return response.data.data;
}
