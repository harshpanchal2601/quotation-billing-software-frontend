import { apiClient, type ApiSuccessResponse } from '@shared/api/apiClient';

export type BusinessPolicy = {
  schemaVersion: 1;
  currency: 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'SAR' | 'JPY' | 'KWD' | 'BHD';
  rounding: 'HALF_UP' | 'HALF_EVEN' | 'DOWN';
  grandTotal: 'MINOR_UNIT' | 'WHOLE_UNIT';
  tax: { id: 'none'; version: 1 } | { id: 'india-gst'; version: 1; country: 'IN'; mode: 'CGST_SGST' | 'IGST'; rate: string };
  inAppNotifications: boolean;
};
export type BusinessPolicyConfiguration = { version: number; policy: BusinessPolicy };
export const businessPolicyQueryKey = ['settings', 'business-policy'] as const;

export async function getBusinessPolicyRequest() {
  const response = await apiClient.get<ApiSuccessResponse<{ configuration: BusinessPolicyConfiguration }>>('/settings/business-policy');
  return response.data.data.configuration;
}
export async function updateBusinessPolicyRequest(input: { expectedVersion: number; policy: BusinessPolicy }) {
  const response = await apiClient.put<ApiSuccessResponse<{ configuration: BusinessPolicyConfiguration }>>('/settings/business-policy', input);
  return response.data.data.configuration;
}
