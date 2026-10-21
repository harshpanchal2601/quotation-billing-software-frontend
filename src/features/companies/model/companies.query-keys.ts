import type { CompanyListParams, QuotationHistoryParams } from './companies.types';

export const companiesQueryKeys = {
  all: ['companies'] as const,
  lists: () => [...companiesQueryKeys.all, 'list'] as const,
  list: (params: CompanyListParams) => [...companiesQueryKeys.lists(), params] as const,
  details: () => [...companiesQueryKeys.all, 'detail'] as const,
  detail: (companyId: number) => [...companiesQueryKeys.details(), companyId] as const,
  quotations: (companyId: number, params: QuotationHistoryParams) =>
    [...companiesQueryKeys.all, 'quotations', companyId, params] as const,
};
