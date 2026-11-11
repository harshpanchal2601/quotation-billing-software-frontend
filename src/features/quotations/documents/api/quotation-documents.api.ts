import { apiClient, type ApiSuccessResponse } from '@shared/api/apiClient';
import type {
  GeneratedDocumentHistoryResponse,
  QuotationHistoryParams,
  QuotationCommunicationHistoryResponse,
  SendQuotationEmailInput,
  SendQuotationEmailResponse,
} from '../model/quotation-documents.types';

export async function getGeneratedDocumentHistoryRequest(
  quotationId: number,
  params: number | QuotationHistoryParams = 1,
): Promise<GeneratedDocumentHistoryResponse> {
  const response = await apiClient.get<ApiSuccessResponse<GeneratedDocumentHistoryResponse>>(
    `/quotations/${quotationId}/documents`,
    { params: typeof params === 'number' ? { page: params, limit: 20 } : { limit: 20, ...params } },
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
  params: number | QuotationHistoryParams = 1,
): Promise<QuotationCommunicationHistoryResponse> {
  const response = await apiClient.get<ApiSuccessResponse<QuotationCommunicationHistoryResponse>>(
    `/quotations/${quotationId}/communications`,
    { params: typeof params === 'number' ? { page: params, limit: 20 } : { limit: 20, ...params } },
  );
  return response.data.data;
}
