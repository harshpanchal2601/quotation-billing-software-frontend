export { useFirmId as useBillingFirmId } from '@shared/tenancy/useFirmId';
import type { BillingScope } from './invoices.types';

export const invoicesQueryKeys = {
  all: ['billing'] as const,
  firm: (firmId: number | null | undefined) => ['billing', firmId] as const,
  list: (firmId: number | null | undefined, scope: BillingScope, params: object) => ['billing', firmId, scope, 'list', params] as const,
  detail: (firmId: number | null | undefined, scope: BillingScope, id: number) => ['billing', firmId, scope, 'detail', id] as const,
  settings: (firmId: number | null | undefined) => ['billing', firmId, 'settings'] as const,
};
