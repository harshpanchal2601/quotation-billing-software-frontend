export interface QuotationAttachment {
  id: number;
  quotationId: number;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  fileCategory: string;
  canPreview: boolean;
  uploadedAt: string;
  uploadedBy?: {
    id: number;
    name: string;
  };
}

export interface QuotationAttachmentListResponse {
  attachments: QuotationAttachment[];
  limits: {
    maximumAttachments: number;
    remainingAttachments: number;
    maximumFileSizeBytes: number;
  };
}
