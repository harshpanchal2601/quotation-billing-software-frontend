import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as attachmentsApi from './api/quotation-attachments.api';
import * as documentsApi from './api/quotation-documents.api';
import * as quotationsApi from './api/quotations.api';
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
  rootQuotationId: 1,
  previousRevisionId: null,
  isLatestRevision: true,
  canEdit: true,
  canCreateRevision: false,
  previousRevision: null,
  nextRevision: null,
  latestRevision: null,
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

const mockCommunicationHistoryResponse = {
  communications: [
    {
      id: 100,
      quotationId: 1,
      generatedDocumentId: 10,
      quotationRevisionNumber: 0,
      communicationType: 'QUOTATION_EMAIL',
      status: 'ACCEPTED' as const,
      attemptNumber: 1,
      to: ['ramesh@mankind.com'],
      cc: ['manager@mankind.com'],
      bcc: ['audit@buminex.test'],
      subject: 'Quotation BUMINEX/2026-27/000001',
      message: 'Please find attached.',
      document: { displayFilename: 'Quotation-BUMINEX-2026-27-000001-v1.pdf' },
      attachments: [{ id: 5, originalFilename: 'layout.pdf' }],
      providerMessageId: 'smtp-message-123',
      failureCategory: null,
      failureSummary: null,
      createdAt: '2026-07-26T10:00:00.000Z',
      acceptedAt: '2026-07-26T10:01:00.000Z',
      failedAt: null,
      sender: { id: 1, name: 'Admin User', email: 'admin@example.com' },
    },
  ],
  pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
};

describe('Generated Document History & Quotation Email Frontend', () => {
  const mockOnFeedback = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockViewport(1200);
    vi.mocked(documentsApi.getGeneratedDocumentHistoryRequest).mockResolvedValue(mockHistoryResponse);
    vi.mocked(documentsApi.getQuotationCommunicationHistoryRequest).mockResolvedValue(mockCommunicationHistoryResponse);
    vi.mocked(attachmentsApi.getQuotationAttachmentsRequest).mockResolvedValue({
      attachments: [],
      limits: { maximumAttachments: 20, remainingAttachments: 20, maximumFileSizeBytes: 20971520 },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not show the empty generated-document state before the first request completes', () => {
    const pendingHistory = deferred<GeneratedDocumentHistoryResponse>();
    vi.mocked(documentsApi.getGeneratedDocumentHistoryRequest).mockReturnValue(pendingHistory.promise);

    renderWithProviders(<QuotationDocumentsSection quotation={mockQuotationDetail} onFeedback={mockOnFeedback} />);

    expect(screen.getByText(/Generated Documents/i)).toBeInTheDocument();
    expect(screen.queryByText(/No generated PDF documents yet/i)).not.toBeInTheDocument();
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

  it('renders revision-specific communication history with SMTP acceptance wording', async () => {
    const user = userEvent.setup();
    renderWithProviders(<QuotationDocumentsSection quotation={mockQuotationDetail} onFeedback={mockOnFeedback} />);

    expect(await screen.findByText('Accepted by email server')).toBeInTheDocument();
    expect(screen.getByText('Communication History')).toBeInTheDocument();
    expect(screen.getByText(/To: ramesh@mankind.com/i)).toBeInTheDocument();
    expect(screen.getByText(/CC: manager@mankind.com/i)).toBeInTheDocument();
    expect(screen.getByText(/BCC: audit@buminex.test/i)).toBeInTheDocument();
    expect(screen.getByText('Revision 0')).toBeInTheDocument();
    expect(screen.getByText('1 file')).toBeInTheDocument();
    expect(screen.getAllByText('Quotation-BUMINEX-2026-27-000001-v1.pdf')[0]).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /expand communication details/i }));

    expect(screen.getByText('Message')).toBeInTheDocument();
    expect(screen.getByText('Please find attached.')).toBeInTheDocument();
    expect(screen.getByText('Supporting attachments')).toBeInTheDocument();
    expect(screen.getByText('layout.pdf')).toBeInTheDocument();
  });

  it('renders communication history as compact cards on mobile and tablet widths', async () => {
    mockViewport(700);
    const user = userEvent.setup();
    renderWithProviders(<QuotationDocumentsSection quotation={mockQuotationDetail} onFeedback={mockOnFeedback} />);

    expect(await screen.findByLabelText('Communication history cards')).toBeInTheDocument();
    expect(screen.getByText('Recipients')).toBeInTheDocument();
    expect(screen.getByText(/To: ramesh@mankind.com/i)).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
    expect(screen.getAllByText('Revision 0')[0]).toBeInTheDocument();
    expect(screen.getByText('Attachments')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /expand communication details/i }));

    expect(screen.getByText('Please find attached.')).toBeInTheDocument();
    expect(screen.getByText('layout.pdf')).toBeInTheDocument();
  });

  it('shows local pending state while generating a new PDF', async () => {
    const pendingPdf = deferred<Awaited<ReturnType<typeof quotationsApi.generateQuotationPdfRequest>>>();
    vi.mocked(quotationsApi.generateQuotationPdfRequest).mockReturnValue(pendingPdf.promise);

    const user = userEvent.setup();
    renderWithProviders(<QuotationDocumentsSection quotation={mockQuotationDetail} onFeedback={mockOnFeedback} />);

    await screen.findAllByText('Quotation-BUMINEX-2026-27-000001-v1.pdf');
    await user.click(screen.getByRole('button', { name: /generate new pdf/i }));

    expect(screen.getByRole('button', { name: /generating pdf/i })).toBeDisabled();
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function mockViewport(width: number) {
  vi.stubGlobal('innerWidth', width);
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: matchesMediaQuery(query, width),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

function matchesMediaQuery(query: string, width: number) {
  const maxWidth = query.match(/\(max-width:\s*([0-9.]+)px\)/);
  if (maxWidth && width > Number(maxWidth[1])) return false;
  const minWidth = query.match(/\(min-width:\s*([0-9.]+)px\)/);
  if (minWidth && width < Number(minWidth[1])) return false;
  return true;
}
