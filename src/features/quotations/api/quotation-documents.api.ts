import { apiClient, type ApiSuccessResponse } from '../../../services/apiClient';
import type {
  GeneratedDocumentHistoryResponse,
  SendQuotationEmailInput,
  SendQuotationEmailResponse,
} from '../quotation-documents.types';

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
