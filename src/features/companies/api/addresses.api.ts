import { apiClient, type ApiSuccessResponse } from '../../../services/apiClient';
import type { CompanyAddress } from '../companies.types';
import type { AddressSubmitValues } from '../schemas/address.schema';

type AddressResponse = {
  address: CompanyAddress;
};

export async function createCompanyAddressRequest(companyId: number, input: AddressSubmitValues) {
  const response = await apiClient.post<ApiSuccessResponse<AddressResponse>>(`/companies/${companyId}/addresses`, input);
  return response.data.data.address;
}

export async function updateCompanyAddressRequest(companyId: number, addressId: number, input: AddressSubmitValues) {
  const response = await apiClient.put<ApiSuccessResponse<AddressResponse>>(`/companies/${companyId}/addresses/${addressId}`, input);
  return response.data.data.address;
}

export async function deleteCompanyAddressRequest(companyId: number, addressId: number) {
  await apiClient.delete(`/companies/${companyId}/addresses/${addressId}`);
}

export async function setPrimaryCompanyAddressRequest(companyId: number, addressId: number) {
  const response = await apiClient.patch<ApiSuccessResponse<AddressResponse>>(`/companies/${companyId}/addresses/${addressId}/primary`);
  return response.data.data.address;
}
