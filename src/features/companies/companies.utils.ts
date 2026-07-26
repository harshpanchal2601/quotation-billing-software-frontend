import type { AddressType, CompanyAddress } from './companies.types';

export const unavailable = '—';

export function formatAddress(address: CompanyAddress | null | undefined) {
  if (!address) return unavailable;
  const parts = [
    address.addressLine1,
    address.addressLine2,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ].filter((part): part is string => typeof part === 'string' && part.trim().length > 0);
  return parts.length === 0 ? unavailable : parts.join(', ');
}

export function formatLocation(address: CompanyAddress | null | undefined) {
  if (!address) return unavailable;
  const parts = [address.city, address.state].filter((part) => part.trim().length > 0);
  return parts.length > 0 ? parts.join(', ') : formatAddress(address);
}

export function formatReadableDate(value: string | null | undefined) {
  if (!value) return unavailable;
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(value));
}

export function formatCurrency(value: string | null | undefined, currency: string | null | undefined) {
  if (!value || !currency) return unavailable;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return unavailable;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
}

export function addressTypeLabel(addressType: AddressType) {
  return {
    BILLING: 'Billing',
    SHIPPING: 'Shipping',
    OTHER: 'Other',
  }[addressType];
}

export function hasText(value: string | null | undefined) {
  return value !== null && value !== undefined && value.trim().length > 0;
}

export function omitEmptyParams(params: Record<string, string | number | boolean | undefined>) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && String(value).trim().length > 0),
  );
}
