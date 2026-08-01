import { resolveAssetUrl } from '@shared/api/assetUrl';

export function emptyStringToNull(value: string | null | undefined) {
  const trimmed = value?.trim() ?? '';
  return trimmed.length === 0 ? null : trimmed;
}

export function normaliseUppercase(value: string | null | undefined) {
  return emptyStringToNull(value)?.toUpperCase() ?? null;
}

export function normaliseLowercase(value: string | null | undefined) {
  return emptyStringToNull(value)?.toLowerCase() ?? null;
}

export function normaliseHexColour(value: string) {
  const trimmed = value.trim();
  return trimmed.startsWith('#') ? trimmed.toUpperCase() : `#${trimmed.toUpperCase()}`;
}

export function maskAccountNumber(accountNumber: string) {
  const trimmed = accountNumber.trim();
  const lastFour = trimmed.slice(-4);
  return `${'•'.repeat(Math.max(trimmed.length - lastFour.length, 4))}${lastFour}`;
}

export { resolveAssetUrl };

export function getSafeApiErrorMessage(error: { message?: string } | unknown) {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim().length > 0) return message;
  }
  return 'Something went wrong. Please try again.';
}
