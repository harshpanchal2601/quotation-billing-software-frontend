import { apiClient, type ApiSuccessResponse } from '@shared/api/apiClient';
import type { CompanyContact } from '../companies.types';
import type { ContactSubmitValues } from '../schemas/contact.schema';

type ContactResponse = {
  contact: CompanyContact;
};

export async function createCompanyContactRequest(companyId: number, input: ContactSubmitValues) {
  const response = await apiClient.post<ApiSuccessResponse<ContactResponse>>(`/companies/${companyId}/contacts`, input);
  return response.data.data.contact;
}

export async function updateCompanyContactRequest(companyId: number, contactId: number, input: ContactSubmitValues) {
  const response = await apiClient.put<ApiSuccessResponse<ContactResponse>>(`/companies/${companyId}/contacts/${contactId}`, input);
  return response.data.data.contact;
}

export async function deleteCompanyContactRequest(companyId: number, contactId: number) {
  await apiClient.delete(`/companies/${companyId}/contacts/${contactId}`);
}

export async function setPrimaryCompanyContactRequest(companyId: number, contactId: number) {
  const response = await apiClient.patch<ApiSuccessResponse<ContactResponse>>(`/companies/${companyId}/contacts/${contactId}/primary`);
  return response.data.data.contact;
}
