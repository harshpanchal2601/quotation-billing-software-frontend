import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as quotationsApi from './api/quotations.api';
import { QuotationDetailsPage } from './pages/QuotationDetailsPage';
import { QuotationsPage } from './pages/QuotationsPage';
import type { QuotationDetail, QuotationListItem } from './quotations.types';

vi.mock('./api/quotations.api');
vi.mock('../companies/api/companies.api', () => ({
  listCompaniesRequest: vi.fn().mockResolvedValue({ companies: [{ id: 1, name: 'Mankind Pharma' }] }),
  getCompanyRequest: vi.fn().mockResolvedValue({ id: 1, name: 'Mankind Pharma', contacts: [], addresses: [] }),
}));
vi.mock('../items/api/items.api', () => ({
  getItemOptionsRequest: vi.fn().mockResolvedValue([]),
}));
vi.mock('../settings/api/quotation-settings.api', () => ({
  getQuotationSettingsRequest: vi.fn().mockResolvedValue({ defaultTaxMode: 'CGST_SGST' }),
}));

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
}

function renderWithProviders(ui: React.ReactNode, { initialEntries = ['/quotations'] } = {}) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

const mockQuotationListItem: QuotationListItem = {
  id: 1,
  quotationNumber: 'BUMINEX/2026-27/000001',
  revisionNumber: 0,
  companyId: 1,
  company: { id: 1, companyCode: 'COMP-000001', name: 'Mankind Pharma', legalName: null, gstin: null },
  companyNameSnapshot: 'Mankind Pharma',
  companyGstinSnapshot: '24AAAAA0000A1Z5',
  quotationDate: '2026-04-15T00:00:00.000Z',
  validUntil: '2026-05-15T00:00:00.000Z',
  status: 'DRAFT',
  currency: 'INR',
  itemCount: 2,
  subtotal: '10000.00',
  grandTotal: '11800.00',
  createdBy: { id: 1, name: 'Admin', email: 'admin@example.com' },
  createdAt: '2026-04-15T10:00:00.000Z',
  updatedAt: '2026-04-15T10:00:00.000Z',
};

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
  companyPanSnapshot: 'AAAAA0000A',
  contactNameSnapshot: 'Dr. Sharma',
  contactEmailSnapshot: 'sharma@mankind.com',
  contactPhoneSnapshot: '9876543210',
  billingAddressSnapshot: null,
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
  amountInWords: 'Eleven Thousand Eight Hundred Rupees Only',
  deliveryTerms: null,
  dispatchTerms: null,
  paymentTerms: null,
  taxTerms: null,
  freightTerms: null,
  warrantyTerms: null,
  remarks: null,
  termsAndConditions: null,
  internalNotes: null,
  sentAt: null,
  acceptedAt: null,
  rejectedAt: null,
  completedAt: null,
  createdBy: { id: 1, name: 'Admin', email: 'admin@example.com' },
  updatedBy: null,
  createdAt: '2026-04-15T10:00:00.000Z',
  updatedAt: '2026-04-15T10:00:00.000Z',
  items: [
    {
      id: 101,
      quotationId: 1,
      itemId: 1,
      lineNumber: 1,
      itemCodeSnapshot: 'ITEM-000001',
      itemNameSnapshot: 'SS Reactor Tank',
      descriptionSnapshot: '500L SS Tank',
      specificationsSnapshot: null,
      measurementUnitSnapshot: 'PCS',
      quantity: '2.000',
      unitRate: '5000.00',
      discountType: 'NONE',
      discountValue: '0.00',
      discountAmount: '0.00',
      gstRate: '18.00',
      baseAmount: '10000.00',
      taxableAmount: '10000.00',
      taxAmount: '1800.00',
      lineTotal: '11800.00',
      sortOrder: 0,
      createdAt: '2026-04-15T10:00:00.000Z',
      updatedAt: '2026-04-15T10:00:00.000Z',
    },
  ],
  statusHistory: [],
};

describe('quotation frontend management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders quotation list and passes URL search and filter parameters to API', async () => {
    vi.mocked(quotationsApi.listQuotationsRequest).mockResolvedValueOnce({
      quotations: [mockQuotationListItem],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    });

    renderWithProviders(<QuotationsPage />, { initialEntries: ['/quotations?search=BUMINEX'] });

    expect(await screen.findByText('BUMINEX/2026-27/000001')).toBeInTheDocument();
    expect(screen.getByText('Mankind Pharma')).toBeInTheDocument();
    expect(quotationsApi.listQuotationsRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'BUMINEX',
      }),
    );
  });

  it('renders quotation details page with saved snapshot values', async () => {
    vi.mocked(quotationsApi.getQuotationRequest).mockResolvedValueOnce(mockQuotationDetail);

    renderWithProviders(
      <Routes>
        <Route path="/quotations/:id" element={<QuotationDetailsPage />} />
      </Routes>,
      { initialEntries: ['/quotations/1'] },
    );

    expect(await screen.findByText('BUMINEX/2026-27/000001')).toBeInTheDocument();
    expect(screen.getByText('Mankind Pharma')).toBeInTheDocument();
    expect(screen.getByText('SS Reactor Tank')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('hides edit and delete controls for non-draft quotation on details page', async () => {
    const sentQuotation = { ...mockQuotationDetail, status: 'SENT' as const };
    vi.mocked(quotationsApi.getQuotationRequest).mockResolvedValueOnce(sentQuotation);

    renderWithProviders(
      <Routes>
        <Route path="/quotations/:id" element={<QuotationDetailsPage />} />
      </Routes>,
      { initialEntries: ['/quotations/1'] },
    );

    expect(await screen.findByText('BUMINEX/2026-27/000001')).toBeInTheDocument();
    expect(screen.queryByText('Edit Draft')).not.toBeInTheDocument();
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
    expect(screen.getByText('Change Status')).toBeInTheDocument();
  });

  it('opens status dialog and sends status transition request on confirmation', async () => {
    vi.mocked(quotationsApi.getQuotationRequest).mockResolvedValueOnce(mockQuotationDetail);
    vi.mocked(quotationsApi.updateQuotationStatusRequest).mockResolvedValueOnce({
      ...mockQuotationDetail,
      status: 'SENT',
    });

    renderWithProviders(
      <Routes>
        <Route path="/quotations/:id" element={<QuotationDetailsPage />} />
      </Routes>,
      { initialEntries: ['/quotations/1'] },
    );

    const changeStatusBtn = await screen.findByText('Change Status');
    await userEvent.click(changeStatusBtn);

    expect(await screen.findByText('Update Quotation Status')).toBeInTheDocument();

    const updateBtn = screen.getByRole('button', { name: /update status/i });
    await userEvent.click(updateBtn);

    await waitFor(() => {
      expect(quotationsApi.updateQuotationStatusRequest).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          status: 'PENDING',
        }),
      );
    });
  });
});
