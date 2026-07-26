export interface GeneratedDocumentHistoryItem {
  id: number;
  quotationId: number;
  versionNumber: number;
  documentType: string;
  quotationNumber: string;
  displayFilename: string;
  generatedAt: string;
  generatedBy?: {
    id: number;
    name: string;
  };
  isAvailable: boolean;
  canPreview: boolean;
  canEmail: boolean;
}

export interface GeneratedDocumentHistoryResponse {
  documents: GeneratedDocumentHistoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SendQuotationEmailInput {
  generatedDocumentId: number;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  message: string;
  attachmentIds?: number[];
}

export interface SendQuotationEmailResponse {
  quotationId: number;
  generatedDocumentId: number;
  recipientCount: number;
  attachmentCount: number;
  acceptedAt: string;
}
