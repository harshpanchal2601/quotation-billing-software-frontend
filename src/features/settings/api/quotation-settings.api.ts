import { apiClient, type ApiSuccessResponse } from '@shared/api/apiClient';
import type { QuotationSettings } from '../model/settings.types';

export const quotationSettingsQueryKey = ['settings', 'quotation'] as const;

type QuotationSettingsResponse = {
  quotationSettings: QuotationSettings;
};

export async function getQuotationSettingsRequest() {
  const response = await apiClient.get<ApiSuccessResponse<QuotationSettingsResponse>>('/settings/quotation');
  return response.data.data.quotationSettings;
}

export type QuotationSettingsUpdateRequest = Omit<
  QuotationSettings,
  'id' | 'businessProfileId' | 'createdAt' | 'updatedAt'
>;

export async function updateQuotationSettingsRequest(input: QuotationSettingsUpdateRequest) {
  const response = await apiClient.put<ApiSuccessResponse<QuotationSettingsResponse>>('/settings/quotation', input);
  return response.data.data.quotationSettings;
}
