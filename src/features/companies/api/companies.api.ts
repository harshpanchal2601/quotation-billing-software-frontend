import { apiClient, type ApiSuccessResponse } from '../../../services/apiClient';
import { omitEmptyParams } from '../companies.utils';
import type {
  CompanyDetail,
  CompanyListParams,
  CompanyListResponse,
  CompanyQuotationHistoryResponse,
  QuotationHistoryParams,
} from '../companies.types';
import type { CompanyCreateSubmitValues, CompanyUpdateSubmitValues } from '../schemas/company.schema';

type CompanyResponse = {
  company: CompanyDetail;
};

export async function listCompaniesRequest(params: CompanyListParams) {
  const response = await apiClient.get<ApiSuccessResponse<CompanyListResponse>>('/companies', {
    params: omitEmptyParams(params),
  });
  return response.data.data;
}

export async function createCompanyRequest(input: CompanyCreateSubmitValues) {
  const response = await apiClient.post<ApiSuccessResponse<CompanyResponse>>('/companies', input);
  return response.data.data.company;
}

export async function getCompanyRequest(id: number) {
  const response = await apiClient.get<ApiSuccessResponse<CompanyResponse>>(`/companies/${id}`);
  return response.data.data.company;
}

export async function updateCompanyRequest(id: number, input: CompanyUpdateSubmitValues) {
  const response = await apiClient.put<ApiSuccessResponse<CompanyResponse>>(`/companies/${id}`, input);
  return response.data.data.company;
}

export async function updateCompanyStatusRequest(id: number, isActive: boolean) {
  const response = await apiClient.patch<ApiSuccessResponse<CompanyResponse>>(`/companies/${id}/status`, { isActive });
  return response.data.data.company;
}

export async function deleteCompanyRequest(id: number) {
  await apiClient.delete(`/companies/${id}`);
}

export async function listCompanyQuotationsRequest(id: number, params: QuotationHistoryParams) {
  const response = await apiClient.get<ApiSuccessResponse<CompanyQuotationHistoryResponse>>(`/companies/${id}/quotations`, {
    params: omitEmptyParams(params),
  });
  return response.data.data;
}
