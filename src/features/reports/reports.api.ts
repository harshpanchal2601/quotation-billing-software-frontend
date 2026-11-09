import { apiClient, type ApiSuccessResponse } from '@shared/api/apiClient';
import type { ReportFilters, ReportOverview, SavedReportPage, SavedReportView } from './reports.types';

export const reportsKeys = { firm: (firmId: number | null | undefined, actorId: number | undefined) => ['reports', firmId, actorId] as const };
const params = (filters: ReportFilters) => ({ ...filters, sections: filters.sections.join(',') });
export async function loadReport(filters: ReportFilters, signal?: AbortSignal) {
  return (await apiClient.get<ApiSuccessResponse<ReportOverview>>('/reports/overview', { params: params(filters), signal, timeout: 35_000 })).data.data;
}
export async function loadSavedReports(page: number, signal?: AbortSignal) {
  return (await apiClient.get<ApiSuccessResponse<SavedReportPage>>('/reports/saved-views', { params: { page, limit: 20 }, signal })).data.data;
}
export async function saveReportView(name: string, filters: ReportFilters, existing?: Pick<SavedReportView, 'id' | 'version'>) {
  const response = existing
    ? await apiClient.put<ApiSuccessResponse<{ view: SavedReportView }>>(`/reports/saved-views/${existing.id}`, { name, filters, expectedVersion: existing.version })
    : await apiClient.post<ApiSuccessResponse<{ view: SavedReportView }>>('/reports/saved-views', { name, filters });
  return response.data.data.view;
}
export async function deleteReportView(view: Pick<SavedReportView, 'id' | 'version'>) {
  await apiClient.delete(`/reports/saved-views/${view.id}`, { data: { expectedVersion: view.version } });
}
export async function downloadReport(filters: ReportFilters, signal?: AbortSignal) {
  const response = await apiClient.get<string>('/reports/export.csv', { params: params(filters), signal, responseType: 'text', timeout: 35_000 });
  return new Blob([response.data], { type: 'text/csv;charset=utf-8' });
}
