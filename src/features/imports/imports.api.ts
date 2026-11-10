import { apiClient, type ApiSuccessResponse } from '@shared/api/apiClient';

export type ImportTarget = 'CUSTOMERS' | 'ITEMS';
export type ImportBatch = { id: number; target: ImportTarget; version: number; status: string; totalRecords: number; successfulRecords: number; failedRecords: number; startedAt: string };
export type ImportDetail = { batch: ImportBatch; rows: Array<{ id: number; sourceIdentifier: string | null; status: string; errorMessage: string | null; rawData: Record<string, string>; targetId: number | null; compensatedAt: string | null }> };
export const importKeys = (firmId: number | null | undefined, actorId: number | undefined) => ['imports', firmId, actorId] as const;
export async function loadImports(page: number, signal?: AbortSignal) {
  return (await apiClient.get<ApiSuccessResponse<{ batches: ImportBatch[]; pagination: { totalPages: number } }>>('/imports', { params: { page, limit: 20 }, signal })).data.data;
}
export async function loadImport(id: number, signal?: AbortSignal) {
  return (await apiClient.get<ApiSuccessResponse<ImportDetail>>(`/imports/${id}`, { signal })).data.data;
}
export async function previewImport(target: ImportTarget, csv: string) {
  return (await apiClient.post<ApiSuccessResponse<ImportDetail>>('/imports/preview', { target, csv }, { timeout: 60_000 })).data.data;
}
export async function commitImport(batch: ImportBatch) {
  return (await apiClient.post<ApiSuccessResponse<ImportDetail>>(`/imports/${batch.id}/commit`, { expectedVersion: batch.version }, { timeout: 180_000 })).data.data;
}
export async function compensateImport(batch: ImportBatch, rowId: number) {
  return (await apiClient.post<ApiSuccessResponse<ImportDetail>>(`/imports/${batch.id}/rows/${rowId}/compensate`, { expectedVersion: batch.version })).data.data;
}
