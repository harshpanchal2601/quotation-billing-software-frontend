import type { DiscountType, QuotationStatus, TaxMode } from './quotations.types';

export function formatCurrency(amount: number | string | null | undefined, currency: string = 'INR'): string {
  if (amount === null || amount === undefined || amount === '') return `${currency} 0.00`;
  const num = Number(amount);
  if (!Number.isFinite(num)) return `${currency} 0.00`;

  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(num);
  } catch {
    return `${currency} ${num.toFixed(2)}`;
  }
}

export function formatQuotationStatusLabel(status: QuotationStatus): string {
  switch (status) {
    case 'DRAFT':
      return 'Draft';
    case 'PENDING':
      return 'Pending Review';
    case 'SENT':
      return 'Sent';
    case 'ACCEPTED':
      return 'Accepted';
    case 'REJECTED':
      return 'Rejected';
    case 'COMPLETED':
      return 'Completed';
    case 'EXPIRED':
      return 'Expired';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return status;
  }
}

export function getQuotationStatusChipColor(
  status: QuotationStatus,
): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' {
  switch (status) {
    case 'DRAFT':
      return 'default';
    case 'PENDING':
      return 'warning';
    case 'SENT':
      return 'info';
    case 'ACCEPTED':
      return 'success';
    case 'COMPLETED':
      return 'primary';
    case 'REJECTED':
    case 'CANCELLED':
      return 'error';
    case 'EXPIRED':
      return 'default';
    default:
      return 'default';
  }
}

export function formatTaxModeLabel(taxMode: TaxMode): string {
  switch (taxMode) {
    case 'CGST_SGST':
      return 'CGST + SGST (Intra-state)';
    case 'IGST':
      return 'IGST (Inter-state)';
    case 'NONE':
      return 'No Tax / Exempt';
    default:
      return taxMode;
  }
}

export function formatDiscountTypeLabel(type: DiscountType): string {
  switch (type) {
    case 'NONE':
      return 'No Discount';
    case 'PERCENTAGE':
      return 'Percentage (%)';
    case 'FIXED':
      return 'Fixed Amount';
    default:
      return type;
  }
}

const TRANSITION_MATRIX: Record<QuotationStatus, QuotationStatus[]> = {
  DRAFT: ['PENDING', 'SENT', 'CANCELLED'],
  PENDING: ['SENT', 'ACCEPTED', 'REJECTED', 'CANCELLED'],
  SENT: ['ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED'],
  ACCEPTED: ['COMPLETED', 'CANCELLED'],
  REJECTED: [],
  COMPLETED: [],
  EXPIRED: [],
  CANCELLED: [],
};

export function getValidNextStatuses(currentStatus: QuotationStatus): QuotationStatus[] {
  return TRANSITION_MATRIX[currentStatus] ?? [];
}

export function omitEmptyParams<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null && value !== '') {
      result[key as keyof T] = value as T[keyof T];
    }
  }
  return result;
}
