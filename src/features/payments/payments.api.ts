import { apiClient, type ApiSuccessResponse } from '@shared/api/apiClient';
import type { Allocation, InvoiceSettlement, Pagination, Payment, PaymentSummary, ReceiptInput, Receivables } from './payments.types';

export async function listPayments(params: Record<string, string | number>, signal?: AbortSignal) { return (await apiClient.get<ApiSuccessResponse<{ payments: PaymentSummary[]; pagination: Pagination }>>('/payments', { params, signal })).data.data; }
export async function getPayment(id: number, signal?: AbortSignal) { return (await apiClient.get<ApiSuccessResponse<{ payment: Payment }>>(`/payments/${id}`, { signal })).data.data.payment; }
export async function getPaymentCustomers(search: string, signal?: AbortSignal) { return (await apiClient.get<ApiSuccessResponse<{ customers: Array<{ id: number; name: string }> }>>('/payments/options/customers', { params: { search }, signal })).data.data.customers; }
export async function recordPayment(input: ReceiptInput) { return (await apiClient.post<ApiSuccessResponse<{ payment: Payment }>>('/payments', input)).data.data.payment; }
export async function allocatePayment(id: number, idempotencyKey: string, allocations: Allocation[]) { return (await apiClient.post<ApiSuccessResponse<{ payment: Payment }>>(`/payments/${id}/allocate`, { idempotencyKey, allocations })).data.data.payment; }
export async function reversePayment(id: number, idempotencyKey: string, reason: string) { return (await apiClient.post<ApiSuccessResponse<{ payment: Payment }>>(`/payments/${id}/reverse`, { idempotencyKey, reason })).data.data.payment; }
export async function refundPayment(id: number, input: { idempotencyKey: string; amount: string; reference: string; reason: string; paidDate: string; confirmed: true }) { return (await apiClient.post<ApiSuccessResponse<{ payment: Payment }>>(`/payments/${id}/refunds`, input)).data.data.payment; }
export async function getReceivables(params: Record<string, string | number>, signal?: AbortSignal) { return (await apiClient.get<ApiSuccessResponse<Receivables>>('/receivables/aging', { params, signal })).data.data; }
export async function getInvoiceSettlement(id: number, signal?: AbortSignal) { return (await apiClient.get<ApiSuccessResponse<InvoiceSettlement>>(`/receivables/invoices/${id}`, { signal })).data.data; }
export async function getPaymentCapabilities(signal?: AbortSignal) { return (await apiClient.get<ApiSuccessResponse<{ paymentLinks: { enabled: boolean; reason: string }; reminders: { enabled: boolean; reason: string } }>>('/payments/capabilities', { signal })).data.data; }
