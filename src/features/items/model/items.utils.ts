import { resolveAssetUrl } from '@shared/api/assetUrl';
import type { ItemSourceType } from './items.types';

export { resolveAssetUrl };

export function formatItemSourceTypeLabel(sourceType: ItemSourceType): string {
  switch (sourceType) {
    case 'MANUAL':
      return 'Manual';
    case 'WEBSITE_IMPORT':
      return 'Website import';
    case 'CSV_IMPORT':
      return 'CSV import';
    default:
      return sourceType;
  }
}

export function formatReadableDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(value));
}

export function formatCurrencyRate(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '₹0.00';
  const num = Number(value);
  if (!Number.isFinite(num)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(num);
}

export function formatGstRateLabel(gstRate: string | number | null | undefined): string {
  if (gstRate === null || gstRate === undefined || gstRate === '') return '18%';
  const num = Number(gstRate);
  if (!Number.isFinite(num)) return '0%';
  return `${num}%`;
}
