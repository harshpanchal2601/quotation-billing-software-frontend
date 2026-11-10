import { apiClient, type ApiSuccessResponse } from '@shared/api/apiClient';
export type KeyInput = { name: string; lifetimeDays: number; scopes: Array<'reports.read' | 'reports.export'> };
export type ApiKey = { id: string; name: string; scopes: string[]; expiresAt: string; revokedAt: string | null };
export type Endpoint = { id: string; name: string; url: string; enabled: boolean; secretVersion: number };
export type Delivery = { id: string; sourceEventId: string; secretVersion: number; event: { status: string; attempts: number; maxAttempts: number; jobAttempts: Array<{ attempt: number; outcome: string | null; errorCode: string | null }> } };
export async function listProviderStatus(signal?: AbortSignal) { return (await apiClient.get<ApiSuccessResponse<{ firmId: number; providers: Array<{ provider: string; capability: string; state: string; enabled: boolean; reason: string }> }>>('/integrations', { signal })).data.data; }
export const connectionKeys = (firmId: number | null | undefined, actorId: number | undefined) => ['connections', firmId, actorId] as const;
export async function listKeys(page: number, signal?: AbortSignal) { return (await apiClient.get<ApiSuccessResponse<{ keys: ApiKey[]; pagination: { totalPages: number } }>>('/api-keys', { params: { page, limit: 20 }, signal })).data.data; }
export async function issueKey(input: KeyInput, replacing?: string) { return (await apiClient.post<ApiSuccessResponse<{ key: ApiKey; token: string }>>(replacing ? `/api-keys/${replacing}/rotate` : '/api-keys', input)).data.data; }
export async function revokeKey(id: string) { await apiClient.post(`/api-keys/${id}/revoke`); }
export async function listEndpoints(signal?: AbortSignal) { return (await apiClient.get<ApiSuccessResponse<{ endpoints: Endpoint[]; configuration: { encryptionConfigured: boolean; destinationsConfigured: boolean; workerEnabled: boolean; eventTypes: string[] } }>>('/webhooks', { signal })).data.data; }
export async function createEndpoint(name: string, url: string) { return (await apiClient.post<ApiSuccessResponse<{ endpoint: Endpoint; secret: string }>>('/webhooks', { name, url })).data.data; }
export async function toggleEndpoint(endpoint: Endpoint) { await apiClient.put(`/webhooks/${endpoint.id}`, { enabled: !endpoint.enabled }); }
export async function rotateEndpoint(id: string) { return (await apiClient.post<ApiSuccessResponse<{ endpoint: Endpoint; secret: string }>>(`/webhooks/${id}/rotate`)).data.data; }
export async function listDeliveries(id: string, page: number, signal?: AbortSignal) { return (await apiClient.get<ApiSuccessResponse<{ deliveries: Delivery[]; pagination: { totalPages: number } }>>(`/webhooks/${id}/deliveries`, { params: { page, limit: 20 }, signal })).data.data; }
