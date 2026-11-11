import { apiClient, type ApiSuccessResponse } from '@shared/api/apiClient';
import { definitionPaths, type Approval, type Command, type Definition, type DefinitionKind, type FieldRecord, type FieldValues, type Preference, type PublishedDefinition, type Run } from '../model/automation.types';

async function get<T>(path: string, params?: Record<string, string | number | undefined>) { return (await apiClient.get<ApiSuccessResponse<T>>(path, { params })).data.data; }
async function post<T>(path: string, body: unknown) { return (await apiClient.post<ApiSuccessResponse<T>>(path, body)).data.data; }
export const listDefinitions = (kind: DefinitionKind) => get<{ definitions: PublishedDefinition[] }>(definitionPaths[kind]).then((data) => data.definitions);
export const listVersions = (kind: DefinitionKind, key: string, page = 1, sorting: { sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}) => get<{ versions: PublishedDefinition[] }>(`${definitionPaths[kind]}/${encodeURIComponent(key)}`, { page, ...sorting }).then((data) => data.versions);
export const publishDefinition = (kind: DefinitionKind, key: string, expectedVersion: number, definition: Definition) => post<{ definition: PublishedDefinition }>(`${definitionPaths[kind]}/${encodeURIComponent(key)}/publish`, { expectedVersion, definition });
export const rollbackDefinition = (kind: DefinitionKind, key: string, expectedVersion: number, version: number) => post(`${definitionPaths[kind]}/${encodeURIComponent(key)}/rollback`, { expectedVersion, version });
export const previewDefinition = (kind: DefinitionKind, key: string, definition: Definition, event?: unknown) => post<{ preview: unknown }>(`${definitionPaths[kind]}/${encodeURIComponent(key)}/preview`, { definition, event }).then((data) => data.preview);
export const listRuns = (page: number, sorting: { sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}) => get<{ runs: Run[] }>('/automation/runs', { page, ...sorting }).then((data) => data.runs);
export const controlRun = (id: string, command: 'RETRY' | 'CANCEL') => post(`/automation/runs/${id}/${command}`, {});
export const listRecipients = () => get<{ recipients: Array<{ id: number; name: string }> }>('/automation/recipients').then((data) => data.recipients);
export const listApprovals = (page: number, sorting: { sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}) => get<{ approvals: Approval[] }>('/approvals', { page, ...sorting }).then((data) => data.approvals);
export const decideApproval = (id: string, decision: string, reason: string) => post(`/approvals/${id}/decisions`, { decision, reason });
function preferenceValues({ enabled, utcOffsetMinutes, quietStartMinute, quietEndMinute }: Preference): Preference { return { enabled, utcOffsetMinutes, quietStartMinute, quietEndMinute }; }
export const getPreferences = () => get<{ preference: Preference | null }>('/automation/preferences').then((data) => data.preference === null ? null : preferenceValues(data.preference));
export async function savePreferences(preference: Preference) { return preferenceValues((await apiClient.put<ApiSuccessResponse<{ preference: Preference }>>('/automation/preferences', preferenceValues(preference))).data.data.preference); }
export const getFieldValues = (entity: string, entityId: number, page = 1) => get<{ definition: PublishedDefinition | null; current: FieldRecord | null; history?: FieldRecord[]; writable?: boolean }>(`/custom-fields/values/${entity}/${entityId}?page=${page}`);
export async function saveFieldValues(entity: string, entityId: number, expectedVersion: number, definitionId: number, values: FieldValues) { return apiClient.put(`/custom-fields/values/${entity}/${entityId}`, { expectedVersion, definitionId, values }); }
export const searchFieldValues = (entity: string, key: string, value: string) => get<{ entityIds: number[] }>(`/custom-fields/search/${entity}?key=${encodeURIComponent(key)}&value=${encodeURIComponent(value)}`);

// The requester explicitly confirms execution. The original domain endpoint
// rechecks permissions, state, entitlement and consumes the matching approval.
export async function performApprovedAction(command: Command) {
  const { action, entityId, ...input } = command;
  if (action === 'INVOICE_ISSUE') return post(`/invoices/${entityId}/issue`, input);
  if (action === 'CREDIT_NOTE_ISSUE') return post(`/billing-adjustments/${entityId}/issue`, input);
  if (action === 'INVOICE_VOID') return post(`/invoices/${entityId}/void`, input);
  if (action === 'ORDER_CONFIRM') return post('/sales-orders/from-quotation', { sourceRevisionId: entityId, ...input });
  if (action === 'STOCK_ADJUST') return post('/stock/adjustments', { itemId: entityId, ...input });
  if (action === 'QUOTATION_SEND' && (input.status === 'SENT' || input.status === 'ACCEPTED')) return apiClient.patch(`/quotations/${entityId}/status`, input);
  throw new Error('Complete this approved email from the quotation page');
}
