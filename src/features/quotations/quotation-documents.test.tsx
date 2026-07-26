import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as attachmentsApi from './api/quotation-attachments.api';
import * as documentsApi from './api/quotation-documents.api';
import { QuotationDocumentsSection } from './components/QuotationDocumentsSection';
import type { GeneratedDocumentHistoryResponse } from './quotation-documents.types';
import type { QuotationDetail } from './quotations.types';

vi.mock('./api/quotation-documents.api');
vi.mock('./api/quotation-attachments.api');
vi.mock('./api/quotations.api');

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
}

function renderWithProviders(ui: React.ReactNode) {
  const queryClient = createTestQueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const mockQuotationDetail: QuotationDetail = {
  id: 1,
  quotationNumber: 'BUMINEX/2026-27/000001',
  revisionNumber: 0,
  companyId: 1,
  companyContactId: null,
  billingAddressId: null,
  shippingAddressId: null,
  company: null,
  companyNameSnapshot: 'Mankind Pharma',
  companyGstinSnapshot: '24AAAAA0000A1Z5',
  companyPanSnapshot: null,
  contactNameSnapshot: 'Dr. Ramesh Sharma',
  contactEmailSnapshot: 'ramesh@mankind.com',
  contactPhoneSnapshot: '9876543210',
  billingAddressSnapshot: { addressLine1: 'Main St', addressLine2: null, city: 'Mumbai', state: 'MH', postalCode: '400001', country: 'India' },
  shippingAddressSnapshot: null,
  quotationDate: '2026-04-15T00:00:00.000Z',
  validUntil: '2026-05-15T00:00:00.000Z',
  customerReference: null,
  internalReference: null,
  status: 'DRAFT',
  currency: 'INR',
  taxMode: 'CGST_SGST',
  subtotal: '10000.00',
  itemDiscountAmount: '0.00',
  quotationDiscountType: 'NONE',
  quotationDiscountValue: '0.00',
  quotationDiscountAmount: '0.00',
  taxableAmount: '10000.00',
  cgstAmount: '900.00',
  sgstAmount: '900.00',
  igstAmount: '0.00',
  freightAmount: '0.00',
  freightIncluded: false,
  freightIsTaxable: false,
  otherCharges: '0.00',
  roundOffAmount: '0.00',
  grandTotal: '11800.00',
  amountInWords: null,
  deliveryTerms: null,
  dispatchTerms: null,
  paymentTerms: null,
  taxTerms: null,
  freightTerms: null,
  warrantyTerms: null,
  remarks: null,
  termsAndConditions: null,
  internalNotes: 'Confidential pricing note',
  sentAt: null,
  acceptedAt: null,
  rejectedAt: null,
  completedAt: null,
  createdBy: { id: 1, name: 'Admin', email: 'admin@example.com' },
  updatedBy: null,
  createdAt: '2026-04-15T10:00:00.000Z',
  updatedAt: '2026-04-15T10:00:00.000Z',
  items: [],
  statusHistory: [],
};

const mockHistoryResponse: GeneratedDocumentHistoryResponse = {
  documents: [
    {
      id: 10,
      quotationId: 1,
      versionNumber: 1,
      documentType: 'QUOTATION_PDF',
      quotationNumber: 'BUMINEX/2026-27/000001',
      displayFilename: 'Quotation-BUMINEX-2026-27-000001-v1.pdf',
      generatedAt: '2026-07-26T10:00:00.000Z',
      generatedBy: { id: 1, name: 'Admin User' },
      isAvailable: true,
      canPreview: true,
      canEmail: true,
    },
  ],
  pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
};

describe('Generated Document History & Quotation Email Frontend', () => {
  const mockOnFeedback = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(documentsApi.getGeneratedDocumentHistoryRequest).mockResolvedValue(mockHistoryResponse);
    vi.mocked(attachmentsApi.getQuotationAttachmentsRequest).mockResolvedValue({
      attachments: [],
      limits: { maximumAttachments: 20, remainingAttachments: 20, maximumFileSizeBytes: 20971520 },
    });
  });

  it('renders generated document history section and displays version history table', async () => {
    renderWithProviders(<QuotationDocumentsSection quotation={mockQuotationDetail} onFeedback={mockOnFeedback} />);

    expect(screen.getByText(/Generated Documents/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText('Quotation-BUMINEX-2026-27-000001-v1.pdf')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Available')[0]).toBeInTheDocument();
    });
  });

  it('opens email dialog prefilled with contact snapshot email and name', async () => {
    const user = userEvent.setup();
    renderWithProviders(<QuotationDocumentsSection quotation={mockQuotationDetail} onFeedback={mockOnFeedback} />);

    await waitFor(() => {
      expect(screen.getAllByText('Quotation-BUMINEX-2026-27-000001-v1.pdf')[0]).toBeInTheDocument();
    });

    const emailBtn = screen.getAllByRole('button', { name: /Send Email/i })[0];
    await user.click(emailBtn);

    expect(screen.getByText('Send Quotation Email')).toBeInTheDocument();
    expect(screen.getByDisplayValue('ramesh@mankind.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue(/Dear Dr. Ramesh Sharma/i)).toBeInTheDocument();
  });
});
