import { apiClient, type ApiSuccessResponse } from '@shared/api/apiClient';
import { omitEmptyParams } from '../model/quotations.utils';
import type {
  CalculatedQuotationTotals,
  CalculationPreviewInput,
  QuotationCreateInput,
  QuotationDetail,
  QuotationListParams,
  QuotationListResponse,
  QuotationStatusUpdateInput,
  QuotationUpdateInput,
} from '../model/quotations.types';

export async function listQuotationsRequest(params: QuotationListParams): Promise<QuotationListResponse> {
  const response = await apiClient.get<ApiSuccessResponse<QuotationListResponse>>('/quotations', {
    params: omitEmptyParams(params),
  });
  return response.data.data;
}

export async function calculatePreviewRequest(input: CalculationPreviewInput): Promise<CalculatedQuotationTotals> {
  const response = await apiClient.post<ApiSuccessResponse<CalculatedQuotationTotals>>('/quotations/calculate', input);
  return response.data.data;
}

export async function createQuotationRequest(input: QuotationCreateInput): Promise<QuotationDetail> {
  const response = await apiClient.post<ApiSuccessResponse<{ quotation: QuotationDetail }>>('/quotations', input);
  return response.data.data.quotation;
}

export async function getQuotationRequest(id: number): Promise<QuotationDetail> {
  const response = await apiClient.get<ApiSuccessResponse<{ quotation: QuotationDetail }>>(`/quotations/${id}`);
  return response.data.data.quotation;
}

export async function updateQuotationRequest(id: number, input: QuotationUpdateInput): Promise<QuotationDetail> {
  const response = await apiClient.put<ApiSuccessResponse<{ quotation: QuotationDetail }>>(`/quotations/${id}`, input);
  return response.data.data.quotation;
}

export async function createQuotationRevisionRequest(id: number): Promise<QuotationDetail> {
  const response = await apiClient.post<ApiSuccessResponse<{ quotation: QuotationDetail }>>(`/quotations/${id}/revisions`);
  return response.data.data.quotation;
}

export async function updateQuotationStatusRequest(
  id: number,
  input: QuotationStatusUpdateInput,
): Promise<QuotationDetail> {
  const response = await apiClient.patch<ApiSuccessResponse<{ quotation: QuotationDetail }>>(
    `/quotations/${id}/status`,
    input,
  );
  return response.data.data.quotation;
}

export async function deleteQuotationRequest(id: number): Promise<void> {
  await apiClient.delete(`/quotations/${id}`);
}

export async function generateQuotationPdfRequest(
  quotationId: number,
): Promise<{ document: { id: number; quotationId: number; filePath: string }; previewUrl: string; downloadUrl: string }> {
  const response = await apiClient.post<
    ApiSuccessResponse<{
      document: { id: number; quotationId: number; filePath: string };
      previewUrl: string;
      downloadUrl: string;
    }>
  >(`/quotations/${quotationId}/pdf`);
  return response.data.data;
}

export async function getQuotationPdfPreviewBlobRequest(quotationId: number, documentId: number): Promise<Blob> {
  const response = await apiClient.get<Blob>(`/quotations/${quotationId}/pdf/${documentId}/preview`, {
    responseType: 'blob',
  });
  return response.data;
}

export async function downloadQuotationPdfBlobRequest(
  quotationId: number,
  documentId: number,
): Promise<{ blob: Blob; filename: string }> {
  const response = await apiClient.get<Blob>(`/quotations/${quotationId}/pdf/${documentId}/download`, {
    responseType: 'blob',
  });
  const contentDisposition = response.headers['content-disposition'];
  let filename = `Quotation-${quotationId}.pdf`;

  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?([^";]+)"?/);
    if (match && match[1]) {
      filename = match[1];
    }
  }

  return { blob: response.data, filename };
}
