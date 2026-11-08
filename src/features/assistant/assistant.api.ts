import { apiClient, type ApiSuccessResponse } from '@shared/api/apiClient';

export type Mode = 'LOCAL' | 'LLM';
export type Resource = 'CUSTOMERS' | 'ITEMS' | 'QUOTATIONS' | 'INVOICES' | 'ORDERS' | 'PAYMENTS' | 'AUDIT';
export type RecordLink = { id: number; label: string; href: string; customer?: string; status?: string; currency?: string; total?: string; version?: number };
export type DraftLine = { itemId: number | null; itemName: string; quantity: string; unitRate: string; taxRate: string; measurementUnit: string; supplyType: 'GOODS' | 'SERVICE'; discountType: 'NONE'; discountValue: string; hsnCode?: string | null };
export type Draft = { kind: 'INVOICE' | 'QUOTATION' | 'EMAIL' | 'FOLLOW_UP'; unsaved: true; companyId: number; customer: string; lines: DraftLine[]; text: string; subject: string; href: string };
export type Result = { message?: string; records?: RecordLink[]; pagination?: { page: number; total: number; totalPages?: number }; currencies?: Array<{ currency: string; netSales: string; documents: number }>; basis?: string; dateFrom?: string | null; dateTo?: string | null; receivables?: Array<{ id: number; documentNumber: string; companyName: string; currency: string; outstanding: string; href: string }>; buckets?: Array<{ currency: string; bucket: string; amount: string; count: number }>; customerCredits?: Array<{ currency: string; unapplied: string }> } & Partial<Draft>;
export type Reply = { requestId: string; conversationId: string; mode: Mode; fallback: string | null; notice: string | null; plan: { tool: string; resource?: Resource; query?: string; page?: number }; toolStatus: string; result: Result };
export type Status = { localAllowed: boolean; llmAllowed: boolean; mode: Mode | null; fallback: string | null; connection: string; notice: string | null; credits: { used: string; limit: string | null; unit: string }; todayRequests: number; dailyResetTimezone: string; settings: { version: number; llmEnabled: boolean; dailyLlmRequests: number | null; retainContentDays: number | null } };
export type Proposal = { id: string; nonce: string; expiresAt: string; command: Record<string, unknown>; before: Record<string, unknown>; after: Record<string, unknown>; effects: string };
export type History = { conversations: Array<{ id: string; createdAt: string; messages: Array<{ id: string; mode: string; tool: string | null; status: string; errorCode: string | null; createdAt: string }>; proposals: Array<{ id: string; status: string; expiresAt: string; command: { action: string }; execution: { id: string; result: { href: string } } | null }> }>; page: number; hasMore: boolean };
export type Extraction = { untrusted: true; imported: false; candidates: Array<{ sourceLine: number; itemName: string; quantity: string; unitRate: string; itemId: null; verified: false }>; message: string; truncated: boolean };
async function get<T>(url: string) { return (await apiClient.get<ApiSuccessResponse<T>>(url)).data.data; }
async function post<T>(url: string, body: unknown) { return (await apiClient.post<ApiSuccessResponse<T>>(url, body)).data.data; }
export const assistantApi = {
  status: () => get<Status>('/assistant/usage'),
  settings: () => get<Status>('/assistant/settings'),
  saveSettings: async (input: Status['settings']) => (await apiClient.put('/assistant/settings', { expectedVersion: input.version, llmEnabled: input.llmEnabled, dailyLlmRequests: input.dailyLlmRequests, retainContentDays: input.retainContentDays, consent: true })).data,
  chat: (input: { requestId: string; conversationId?: string; message: string; mode: 'AUTO' | Mode; plan?: unknown }) => post<Reply>('/assistant/chat', input),
  propose: (input: { conversationId: string; mode: Mode; command: Record<string, unknown> }) => post<Proposal>('/assistant/proposals', input),
  confirm: (proposal: Proposal) => post<{ id: number; href: string; executionId: string; replayed: boolean }>(`/assistant/proposals/${proposal.id}/confirm`, { confirm: true, nonce: proposal.nonce }),
  cancel: (id: string) => post(`/assistant/proposals/${id}/cancel`, {}),
  history: (page: number) => get<History>(`/assistant/history?page=${page}`),
  erase: (id: string) => apiClient.delete(`/assistant/history/${id}`),
  extract: (source: 'PDF_TEXT' | 'EMAIL_TEXT', text: string) => post<Extraction>('/assistant/extractions', { source, text }),
};
