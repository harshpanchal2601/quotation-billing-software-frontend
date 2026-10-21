import { apiClient, type ApiSuccessResponse } from '@shared/api/apiClient';
import type { QuotationAttachment, QuotationAttachmentListResponse } from '../model/quotation-attachments.types';
import { parseContentDispositionFilename } from '../model/quotation-attachments.utils';

export async function getQuotationAttachmentsRequest(
  quotationId: number,
): Promise<QuotationAttachmentListResponse> {
  const response = await apiClient.get<ApiSuccessResponse<QuotationAttachmentListResponse>>(
    `/quotations/${quotationId}/attachments`,
  );
  return response.data.data;
}

export async function uploadQuotationAttachmentRequest(
  quotationId: number,
  file: File,
  onUploadProgress?: (progressEvent: { loaded: number; total?: number }) => void,
): Promise<QuotationAttachment> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<ApiSuccessResponse<{ attachment: QuotationAttachment }>>(
    `/quotations/${quotationId}/attachments`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (evt) => {
        if (onUploadProgress && evt.loaded !== undefined) {
          onUploadProgress({ loaded: evt.loaded, total: evt.total });
        }
      },
    },
  );

  return response.data.data.attachment;
}

export async function getQuotationAttachmentPreviewBlobRequest(
  quotationId: number,
  attachmentId: number,
): Promise<{ blob: Blob; mimeType: string }> {
  const response = await apiClient.get<Blob>(
    `/quotations/${quotationId}/attachments/${attachmentId}/preview`,
    { responseType: 'blob' },
  );
  const mimeType = (response.headers['content-type'] as string) || 'application/pdf';
  return { blob: response.data, mimeType };
}

export async function downloadQuotationAttachmentBlobRequest(
  quotationId: number,
  attachmentId: number,
  fallbackFilename: string,
): Promise<{ blob: Blob; filename: string }> {
  const response = await apiClient.get<Blob>(
    `/quotations/${quotationId}/attachments/${attachmentId}/download`,
    { responseType: 'blob' },
  );

  const disposition = response.headers['content-disposition'] as string | undefined;
  const filename = parseContentDispositionFilename(disposition, fallbackFilename);

  return { blob: response.data, filename };
}

export async function deleteQuotationAttachmentRequest(
  quotationId: number,
  attachmentId: number,
): Promise<void> {
  await apiClient.delete(`/quotations/${quotationId}/attachments/${attachmentId}`);
}
