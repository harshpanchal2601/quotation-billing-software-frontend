export type Payment = {
  id: number; firmId: number; companyId: number; companyName: string; currency: string; amount: string;
  method: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'EXTERNAL_CONFIRMED'; reference: string | null; receivedDate: string;
  createdById: number; createdAt: string; status: 'RECORDED' | 'REVERSED';
  netAmount: string; allocated: string; unapplied: string; refunded: string; reversed: string;
  allocations: Array<{ id: number; invoiceId: number; documentNumber: string | null; amount: string; active: boolean; createdById: number; createdAt: string }>;
  reversal: null | { id: number; amount: string; reason: string; createdById: number; createdAt: string };
  refunds: Array<{ id: number; amount: string; reference: string; reason: string; paidDate: string; createdById: number; createdAt: string }>;
};
export type Allocation = { invoiceId: number; amount: string };
export type PaymentSummary = Omit<Payment, 'allocations' | 'refunds' | 'reversal'>;
export type ReceiptInput = { companyId: number; currency: string; amount: string; method: Payment['method']; reference: string | null; receivedDate: string; confirmed: true; idempotencyKey: string; allocations: Allocation[] };
export type Pagination = { page: number; limit: number; total: number; totalPages: number };
export type Receivables = {
  asOf: string; timezone: string; pagination: Pagination;
  receivables: Array<{ id: number; companyId: number; companyName: string; documentNumber: string; currency: string; dueDate: string | null; adjustedTotal: string; allocated: string; outstanding: string; settlementStatus: 'UNPAID' | 'PARTIAL'; overdue: boolean }>;
  buckets: Array<{ currency: string; bucket: string; amount: string; count: number }>;
  customerCredits: Array<{ currency: string; unapplied: string }>;
};
export type InvoiceSettlement = { id: number; companyId: number; currency: string; adjustedTotal: string; allocated: string; outstanding: string; settlementStatus: 'UNPAID' | 'PARTIAL' | 'PAID'; overdue: boolean; allocations: Array<{ id: number; paymentId: number; reference: string | null; amount: string; active: boolean; createdById: number; createdAt: string }> };
