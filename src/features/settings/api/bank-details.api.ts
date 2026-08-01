import { apiClient, type ApiSuccessResponse } from '@shared/api/apiClient';
import type { BankDetail } from '../settings.types';

export const bankDetailsQueryKey = ['settings', 'bank-details'] as const;

type BankDetailsResponse = {
  bankDetails: BankDetail[];
};

type BankDetailResponse = {
  bankDetail: BankDetail;
};

export type BankDetailRequest = {
  bankName: string;
  accountName: string;
  accountNumber: string;
  accountType?: string;
  ifscCode?: string;
  branchName?: string;
  swiftCode?: string;
  upiId?: string;
  isDefault: boolean;
};

export async function listBankDetailsRequest() {
  const response = await apiClient.get<ApiSuccessResponse<BankDetailsResponse>>('/settings/bank-details');
  return response.data.data.bankDetails;
}

export async function createBankDetailRequest(input: BankDetailRequest) {
  const response = await apiClient.post<ApiSuccessResponse<BankDetailResponse>>('/settings/bank-details', input);
  return response.data.data.bankDetail;
}

export async function updateBankDetailRequest(id: number, input: BankDetailRequest) {
  const response = await apiClient.put<ApiSuccessResponse<BankDetailResponse>>(`/settings/bank-details/${id}`, input);
  return response.data.data.bankDetail;
}

export async function deleteBankDetailRequest(id: number) {
  await apiClient.delete(`/settings/bank-details/${id}`);
}

export async function setDefaultBankDetailRequest(id: number) {
  const response = await apiClient.patch<ApiSuccessResponse<BankDetailResponse>>(`/settings/bank-details/${id}/default`);
  return response.data.data.bankDetail;
}
