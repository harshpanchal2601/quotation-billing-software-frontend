import type { QuotationListParams } from './quotations.types';

export const quotationsQueryKeys = {
  all: ['quotations'] as const,
  lists: () => [...quotationsQueryKeys.all, 'list'] as const,
  list: (params: QuotationListParams) => [...quotationsQueryKeys.lists(), params] as const,
  details: () => [...quotationsQueryKeys.all, 'detail'] as const,
  detail: (id: number) => [...quotationsQueryKeys.details(), id] as const,
};
