import { apiClient, type ApiSuccessResponse } from '@shared/api/apiClient';
import type { FeatureDefinition, OverrideInput, Plan, PlanDetail, PlanVersion, PlanVersionInput, SubscriptionAuditEvent, SubscriptionDetails, SubscriptionInput, SubscriptionOptions } from './subscriptions.types';

async function read<T>(url: string, signal?: AbortSignal) {
  return (await apiClient.get<ApiSuccessResponse<T>>(url, { signal })).data.data;
}
async function write<T = unknown>(method: 'post' | 'put' | 'patch' | 'delete', url: string, data: unknown) {
  return (await apiClient.request<ApiSuccessResponse<T>>({ method, url, data })).data.data;
}
export const subscriptionsApi = {
  options: (signal?: AbortSignal) => read<SubscriptionOptions>('/platform/subscription-options', signal),
  features: (signal?: AbortSignal) => read<{ features: FeatureDefinition[] }>('/platform/features', signal),
  plans: (page = 1, signal?: AbortSignal) => read<{ plans: Plan[]; total: number }>(`/platform/plans?page=${page}&limit=50`, signal),
  plan: (id: number, signal?: AbortSignal) => read<PlanDetail>(`/platform/plans/${id}`, signal),
  createPlan: (data: { name: string; slug: string; reason: string }) => write<Plan>('post', '/platform/plans', data),
  updatePlan: (id: number, data: { name: string; archived: boolean; reason: string }) => write<Plan>('put', `/platform/plans/${id}`, data),
  switchFeature: (key: string, hardDisabled: boolean, reason: string) => write('patch', `/platform/features/${encodeURIComponent(key)}`, { hardDisabled, reason }),
  saveVersion: (planId: number, versionId: number | null, data: PlanVersionInput) => write<{ versionId: number }>(versionId === null ? 'post' : 'put', `/platform/plans/${planId}/versions${versionId === null ? '' : `/${versionId}`}`, data),
  deleteVersion: (planId: number, versionId: number, reason: string) => write('delete', `/platform/plans/${planId}/versions/${versionId}`, { reason }),
  preview: (planId: number, versionId: number) => read<{ version: PlanVersion; errors: string[]; previewToken: string }>(`/platform/plans/${planId}/versions/${versionId}/preview`),
  publish: (planId: number, versionId: number, reason: string, previewToken: string) => write('post', `/platform/plans/${planId}/versions/${versionId}/publish`, { reason, previewToken }),
  firm: (firmId: number, pages: { subscriptions: number; overrides: number; charges: number }, signal?: AbortSignal) => read<SubscriptionDetails>(`/platform/firms/${firmId}/subscription?subscriptions=${pages.subscriptions}&overrides=${pages.overrides}&charges=${pages.charges}`, signal),
  assign: (firmId: number, input: SubscriptionInput) => write('put', `/platform/firms/${firmId}/subscription`, input),
  cancelScheduled: (firmId: number, id: number, reason: string) => write('delete', `/platform/firms/${firmId}/subscription/${id}`, { reason }),
  override: (firmId: number, input: OverrideInput) => write('post', `/platform/firms/${firmId}/overrides`, input),
  revoke: (firmId: number, id: number, reason: string) => write('delete', `/platform/firms/${firmId}/overrides/${id}`, { reason }),
  reconcile: (firmId: number, reason: string) => write('post', `/platform/firms/${firmId}/usage/reconcile`, { reason }),
  audit: (firmId: number | null, page: number, signal?: AbortSignal) => read<{ events: SubscriptionAuditEvent[]; total: number }>(`/platform/audit?page=${page}&limit=20${firmId === null ? '' : `&firmId=${firmId}`}`, signal),
  usageEvents: (firmId: number, page: number, signal?: AbortSignal) => read<{ events: Array<{ id: number; resource: string; eventId: string; delta: string; createdAt: string }>; total: number }>(`/platform/firms/${firmId}/usage/events?page=${page}&limit=20`, signal),
  charge: (firmId: number, input: { amount: string; currency: string; reason: string; idempotencyKey: string }) => write('post', `/platform/firms/${firmId}/charges`, input),
  payment: (firmId: number, chargeId: number, input: { amount: string; kind: 'PAYMENT' | 'REFUND'; reference: string; reason: string; idempotencyKey: string }) => write('post', `/platform/firms/${firmId}/charges/${chargeId}/payments`, input),
};
