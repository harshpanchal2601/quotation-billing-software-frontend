import axios from 'axios';
import { apiClient, type ApiSuccessResponse } from '@shared/api/apiClient';
import { resolveApiBaseUrl } from '@shared/api/apiBaseUrl';
export type PortalIdentity = { id: number; companyId: number; name: string; email: string; contactId: number; revokedAt: string | null; invitations: Array<{ id: number; expiresAt: string; consumedAt: string | null; revokedAt: string | null }>; grants: Array<{ id: number; quotationId: number | null; invoiceId: number | null; salesOrderId: number | null; allowDecision: boolean; expiresAt: string; revokedAt: string | null; acceptances: Array<{ id: number; decision: string; actorName: string; revisionNumber: number; createdAt: string; snapshotHash: string }> }> };
export async function listPortalAccess(params: Record<string, number>, signal?: AbortSignal) { return (await apiClient.get<ApiSuccessResponse<{ identities: PortalIdentity[]; total: number; hasMoreHistory: boolean }>>('/portal-access', { params, signal })).data.data; }
export async function invitableContacts(companyId: number, signal?: AbortSignal) { return (await apiClient.get<ApiSuccessResponse<{ contacts: Array<{ id: number; name: string; email: string }> }>>('/portal-access/contacts', { params: { companyId }, signal })).data.data.contacts; }
export async function inviteContact(input: { companyId: number; contactId: number; expiresAt: string }) { return (await apiClient.post<ApiSuccessResponse<{ token: string; identityId: number; email: string }>>('/portal-access/invitations', input)).data.data; }
export async function sharePortalDocument(input: Record<string, unknown>) { return apiClient.post('/portal-access/grants', input); }
export async function revokePortalAccess(kind: 'identity' | 'invitation' | 'grant', id: number) { return apiClient.post(`/portal-access/${kind}/${id}/revoke`); }
export async function restorePortalIdentity(id: number) { return apiClient.post(`/portal-access/identity/${id}/restore`); }

// Customer auth is intentionally isolated from internal-user refresh callbacks
// and selected-firm headers. Only the HttpOnly portal cookie supplies scope.
const portalClient = axios.create({ baseURL: resolveApiBaseUrl(import.meta.env), withCredentials: true, timeout: 15000 });
let csrfToken = ''; let sessionRequest: Promise<void> | null = null;
export async function openPortalSession(invitationToken?: string) {
  sessionRequest ??= portalClient.post<ApiSuccessResponse<{ csrfToken: string }>>(`/customer-portal/${invitationToken ? 'exchange' : 'session'}`, invitationToken ? { token: invitationToken } : {}).then((response) => { csrfToken = response.data.data.csrfToken; }).finally(() => { sessionRequest = null; });
  return sessionRequest;
}
export type SharedDocument = { id: number; snapshot: Record<string, unknown>; snapshotHash: string; canDecide: boolean; consent: string; evidence: { decision: string; revisionNumber: number; createdAt: string } | null };
export async function listSharedDocuments(page: number) { return (await portalClient.get<ApiSuccessResponse<{ contactName: string; documents: Array<{ id: number; kind: string; number: string; revisionNumber?: number }>; page: number; hasMore: boolean; consent: string }>>('/customer-portal/documents', { params: { page } })).data.data; }
export async function getSharedDocument(id: number) { return (await portalClient.get<ApiSuccessResponse<SharedDocument>>(`/customer-portal/documents/${id}`)).data.data; }
export async function decideSharedQuotation(document: SharedDocument, decision: 'ACCEPTED' | 'REJECTED', idempotencyKey: string) { return portalClient.post('/customer-portal/decisions', { grantId: document.id, snapshotHash: document.snapshotHash, consent: document.consent, decision, idempotencyKey }, { headers: { 'x-portal-csrf': csrfToken } }); }
export async function endPortalSession() { await portalClient.post('/customer-portal/logout', {}, { headers: { 'x-portal-csrf': csrfToken } }); csrfToken = ''; }
