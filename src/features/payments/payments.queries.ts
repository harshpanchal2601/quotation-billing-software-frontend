export const paymentsKeys = {
  firm: (firmId: number | null | undefined) => ['payments', firmId] as const,
  detail: (firmId: number | null | undefined, id: number) => ['payments', firmId, 'detail', id] as const,
  receivables: (firmId: number | null | undefined, params: object) => ['payments', firmId, 'receivables', params] as const,
};
export const paymentCurrencies = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'JPY', 'KWD', 'BHD'] as const;
export { billingDateToday } from '@shared/dates/billingDate';
