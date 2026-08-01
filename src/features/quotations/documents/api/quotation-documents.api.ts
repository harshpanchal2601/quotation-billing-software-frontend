import { apiClient, type ApiSuccessResponse } from '@shared/api/apiClient';
import type {
  GeneratedDocumentHistoryResponse,
  QuotationCommunicationHistoryResponse,
  SendQuotationEmailInput,
  SendQuotationEmailResponse,
} from '../model/quotation-documents.types';

export async function getGeneratedDocumentHistoryRequest(
  quotationId: number,
  page = 1,
): Promise<GeneratedDocumentHistoryResponse> {
  const response = await apiClient.get<ApiSuccessResponse<GeneratedDocumentHistoryResponse>>(
    `/quotations/${quotationId}/documents`,
    { params: { page, limit: 20 } },
  );
  return response.data.data;
}

export async function sendQuotationEmailRequest(
  quotationId: number,
  input: SendQuotationEmailInput,
): Promise<SendQuotationEmailResponse> {
  const response = await apiClient.post<ApiSuccessResponse<SendQuotationEmailResponse>>(
    `/quotations/${quotationId}/email`,
    input,
  );
  return response.data.data;
}

export async function getQuotationCommunicationHistoryRequest(
  quotationId: number,
  page = 1,
): Promise<QuotationCommunicationHistoryResponse> {
  const response = await apiClient.get<ApiSuccessResponse<QuotationCommunicationHistoryResponse>>(
    `/quotations/${quotationId}/communications`,
    { params: { page, limit: 20 } },
  );
  return response.data.data;
}
