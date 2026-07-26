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
  communicationId: number;
  quotationId: number;
  generatedDocumentId: number;
  status: 'ACCEPTED';
  recipientCount: number;
  attachmentCount: number;
  acceptedAt: string;
  quotationStatusAfter: string;
  statusTransitioned: boolean;
  message: string;
}

export interface QuotationCommunicationHistoryItem {
  id: number;
  quotationId: number;
  generatedDocumentId: number | null;
  quotationRevisionNumber: number | null;
  communicationType: string;
  status: 'PENDING' | 'ACCEPTED' | 'FAILED';
  attemptNumber: number;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  message: string;
  document: unknown;
  attachments: unknown;
  providerMessageId: string | null;
  failureCategory: string | null;
  failureSummary: string | null;
  createdAt: string;
  acceptedAt: string | null;
  failedAt: string | null;
  sender: {
    id: number;
    name: string;
    email: string;
  } | null;
}

export interface QuotationCommunicationHistoryResponse {
  communications: QuotationCommunicationHistoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
