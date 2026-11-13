import { apiClient, type ApiSuccessResponse } from '@shared/api/apiClient';
import type { AccountingConfiguration, AccountingMapping, ExportFormat, ExportJobPage, ReportFilters, ReportOverview, SavedReportPage, SavedReportView } from './reports.types';

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
export async function downloadReport(filters: ReportFilters, signal?: AbortSignal, format: 'csv' | 'xlsx' | 'pdf' = 'csv') {
  const response = await apiClient.get<Blob>(`/reports/export.${format}`, { params: params(filters), signal, responseType: 'blob', timeout: 90_000 });
  return response.data;
}

export async function loadExportJobs(page: number, signal?: AbortSignal, sort?: { sortBy: string; sortOrder: 'asc' | 'desc' }) {
  return (await apiClient.get<ApiSuccessResponse<ExportJobPage>>('/exports', { params: { page, limit: 20, ...sort }, signal })).data.data;
}
export async function queueExport(filters: ReportFilters, format: ExportFormat, requestKey: string) {
  await apiClient.post('/exports', { filters, format, requestKey });
}
export async function removeExport(id: string) { await apiClient.delete(`/exports/${id}`); }
export async function downloadExport(id: string, signal?: AbortSignal) {
  return (await apiClient.get<Blob>(`/exports/${id}/download`, { responseType: 'blob', signal, timeout: 60_000 })).data;
}
export async function loadAccountingMapping(signal?: AbortSignal) {
  return (await apiClient.get<ApiSuccessResponse<AccountingConfiguration>>('/accounting-exports/mapping', { signal })).data.data;
}
export async function publishAccountingMapping(expectedVersion: number, mapping: AccountingMapping) {
  return (await apiClient.post<ApiSuccessResponse<AccountingConfiguration>>('/accounting-exports/mapping', { expectedVersion, mapping })).data.data;
}
export async function downloadAccountingJournal(dateFrom: string, dateTo: string, mappingVersion: number, signal?: AbortSignal) {
  return (await apiClient.get<Blob>('/accounting-exports/export.csv', { params: { dateFrom, dateTo, mappingVersion }, responseType: 'blob', signal, timeout: 60_000 })).data;
}
