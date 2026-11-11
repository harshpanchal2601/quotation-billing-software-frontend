import { apiClient, type ApiPagination, type ApiSuccessResponse } from '@shared/api/apiClient';

export type SchedulePreview = { currency: string; grandTotal: string; taxableAmount: string; taxAmount: string; lines: Array<{ lineNumber: number; itemName: string; quantity: string; unitRate: string; lineTotal: string }> };
export type Schedule = {
  id: number; name: string; status: 'PAUSED' | 'ACTIVE' | 'CANCELLED' | 'COMPLETED'; version: number; nextPeriod: string;
  versions: Array<{ version: number; createdById: number; approvedById: number | null; approvedAt: string | null; config: { sourceDraftId: number; startDate: string; endDate: string | null; intervalMonths: 1 | 3 | 12; dueDays: number }; preview: SchedulePreview }>;
};
export type ScheduleRun = { id: number; period: string; version: number; status: string; invoiceId: number | null; retryCount: number; event: null | { status: string; attempts: number; jobAttempts: Array<{ attempt: number; outcome: string | null; errorCode: string | null }> } };
export type ScheduleCreate = { name: string; sourceDraftId: number; startDate: string; endDate: string | null; intervalMonths: 1 | 3 | 12; dueDays: number; idempotencyKey: string };
export async function listSchedules(page: number, signal?: AbortSignal, sort?: { sortBy: string; sortOrder: 'asc' | 'desc' }) { return (await apiClient.get<ApiSuccessResponse<{ schedules: Array<Pick<Schedule, 'id' | 'name' | 'status' | 'version' | 'nextPeriod'>>; pagination: ApiPagination }>>('/billing-schedules', { params: { page, limit: 20, ...sort }, signal })).data.data; }
export async function getSchedule(id: number, signal?: AbortSignal) { return (await apiClient.get<ApiSuccessResponse<{ schedule: Schedule & { runs: ScheduleRun[] } }>>(`/billing-schedules/${id}`, { signal })).data.data.schedule; }
export async function createSchedule(input: ScheduleCreate) { return (await apiClient.post<ApiSuccessResponse<{ schedule: Schedule }>>('/billing-schedules', input)).data.data.schedule; }
export async function reviseSchedule(id: number, input: { expectedVersion: number; sourceDraftId: number; dueDays: number; endDate: string | null }) { return (await apiClient.patch<ApiSuccessResponse<{ schedule: Schedule }>>(`/billing-schedules/${id}`, input)).data.data.schedule; }
export async function previewSchedule(id: number) { return (await apiClient.get<ApiSuccessResponse<{ preview: SchedulePreview; previewToken: string }>>(`/billing-schedules/${id}/preview`)).data.data; }
export async function approveSchedule(id: number, expectedVersion: number, previewToken: string) { return (await apiClient.post(`/billing-schedules/${id}/approve`, { expectedVersion, previewToken })).data; }
export async function stopSchedule(id: number, action: 'pause' | 'cancel', expectedVersion: number) { return (await apiClient.post(`/billing-schedules/${id}/${action}`, { expectedVersion })).data; }
export async function retryScheduleRun(id: number, runId: number, expectedRetryCount: number) { return (await apiClient.post(`/billing-schedules/${id}/runs/${runId}/retry`, { expectedRetryCount })).data; }
