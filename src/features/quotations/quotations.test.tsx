import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as quotationsApi from './api/quotations.api';
import { QuotationForm } from './components/QuotationForm';
import { QuotationDetailsPage } from './pages/QuotationDetailsPage';
import { QuotationsPage } from './pages/QuotationsPage';
import { quotationFormSchema, type QuotationFormSubmitValues } from './quotations.schema';
import type { CalculatedQuotationTotals, QuotationDetail, QuotationListItem } from './quotations.types';

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
vi.mock('../settings/api/bank-details.api', () => ({
  listBankDetailsRequest: vi.fn().mockResolvedValue([]),
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

  afterEach(() => {
    vi.useRealTimers();
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

  it('preserves current quotation rows while a page transition refetch is pending', async () => {
    const pendingSecondPage = deferred<Awaited<ReturnType<typeof quotationsApi.listQuotationsRequest>>>();
    vi.mocked(quotationsApi.listQuotationsRequest)
      .mockResolvedValueOnce({
        quotations: [mockQuotationListItem],
        pagination: { page: 1, limit: 20, total: 40, totalPages: 2, hasNextPage: true, hasPreviousPage: false },
      })
      .mockReturnValueOnce(pendingSecondPage.promise);

    renderWithProviders(<QuotationsPage />);

    expect(await screen.findByText('BUMINEX/2026-27/000001')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /go to next page/i }));

    expect(screen.getByText('BUMINEX/2026-27/000001')).toBeInTheDocument();
    expect(screen.queryByText('No Quotations Found')).not.toBeInTheDocument();
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

  it('automatically calculates preview when a valid line item exists', async () => {
    vi.mocked(quotationsApi.calculatePreviewRequest).mockResolvedValueOnce(mockTotals('1180.00'));

    renderQuotationForm();

    await waitForPreviewCalls(1);

    expect(quotationsApi.calculatePreviewRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [expect.objectContaining({ itemName: 'SS Reactor Tank', quantity: 1, unitRate: 1000 })],
      }),
    );
    expect(await screen.findByText(/One Thousand One Hundred Eighty Rupees Only/i)).toBeInTheDocument();
  });

  it('recalculates when quantity changes without another interaction', async () => {
    const user = userEvent.setup();
    vi.mocked(quotationsApi.calculatePreviewRequest)
      .mockResolvedValueOnce(mockTotals('1180.00'))
      .mockResolvedValueOnce(mockTotals('2360.00', 'Two Thousand Three Hundred Sixty Rupees Only'));

    renderQuotationForm();
    await waitForPreviewCalls(1);

    await user.clear(screen.getByLabelText(/Quantity/i));
    await user.type(screen.getByLabelText(/Quantity/i), '2');

    await waitForPreviewCalls(2);
    expect(await screen.findByText(/Two Thousand Three Hundred Sixty Rupees Only/i)).toBeInTheDocument();
  });

  it('recalculates for rate, discount, GST and header charge changes', async () => {
    const user = userEvent.setup();
    vi.mocked(quotationsApi.calculatePreviewRequest)
      .mockResolvedValueOnce(mockTotals('1180.00'))
      .mockResolvedValueOnce(mockTotals('1770.00'))
      .mockResolvedValueOnce(mockTotals('1711.00'))
      .mockResolvedValueOnce(mockTotals('1650.00'))
      .mockResolvedValueOnce(mockTotals('1750.00'));

    renderQuotationForm();
    await waitForPreviewCalls(1);

    await user.clear(screen.getByLabelText(/Unit Rate/i));
    await user.type(screen.getByLabelText(/Unit Rate/i), '1500');
    await waitForPreviewCalls(2);

    await user.click(screen.getAllByRole('combobox', { name: /Discount/i })[0]!);
    await user.click(await screen.findByRole('option', { name: '%' }));
    await user.clear(screen.getByLabelText(/Disc Val/i));
    await user.type(screen.getByLabelText(/Disc Val/i), '5');
    await waitForPreviewCalls(3);

    await user.clear(screen.getByLabelText(/GST Rate/i));
    await user.type(screen.getByLabelText(/GST Rate/i), '12');
    await waitForPreviewCalls(4);

    await user.clear(screen.getByLabelText(/Freight Amount/i));
    await user.type(screen.getByLabelText(/Freight Amount/i), '100');
    await waitForPreviewCalls(5);

    expect(quotationsApi.calculatePreviewRequest).toHaveBeenCalledTimes(5);
  });

  it('does not recalculate when only the line description changes', async () => {
    const user = userEvent.setup();
    vi.mocked(quotationsApi.calculatePreviewRequest).mockResolvedValue(mockTotals('1180.00'));

    renderQuotationForm();
    await waitForPreviewCalls(1);

    await user.type(screen.getByLabelText(/Description/i), ' updated text');

    await waitFor(() => expect(quotationsApi.calculatePreviewRequest).toHaveBeenCalledTimes(1), {
      timeout: 500,
    });
  });

  it('recalculates when a line item is removed', async () => {
    const user = userEvent.setup();
    vi.mocked(quotationsApi.calculatePreviewRequest)
      .mockResolvedValueOnce(mockTotals('2360.00'))
      .mockResolvedValueOnce(mockTotals('1180.00'));

    renderQuotationForm({
      items: [
        validFormItem('SS Reactor Tank', 0),
        validFormItem('Mixing Vessel', 1),
      ],
    });
    await waitForPreviewCalls(1);

    await user.click(screen.getAllByTitle('Remove Item')[1]!);

    await waitForPreviewCalls(2);
  });

  it('ignores older calculation responses that return after newer responses', async () => {
    const user = userEvent.setup();
    const oldPreview = deferred<CalculatedQuotationTotals>();
    const newPreview = deferred<CalculatedQuotationTotals>();
    vi.mocked(quotationsApi.calculatePreviewRequest)
      .mockReturnValueOnce(oldPreview.promise)
      .mockReturnValueOnce(newPreview.promise);

    renderQuotationForm();
    await waitForPreviewCalls(1);

    await user.clear(screen.getByLabelText(/Quantity/i));
    await user.type(screen.getByLabelText(/Quantity/i), '2');
    await waitForPreviewCalls(2);

    await act(async () => {
      newPreview.resolve(mockTotals('2360.00', 'Two Thousand Three Hundred Sixty Rupees Only'));
    });
    expect(await screen.findByText(/Two Thousand Three Hundred Sixty Rupees Only/i)).toBeInTheDocument();

    await act(async () => {
      oldPreview.resolve(mockTotals('1180.00'));
    });
    expect(screen.getByText(/Two Thousand Three Hundred Sixty Rupees Only/i)).toBeInTheDocument();
    expect(screen.queryByText(/One Thousand One Hundred Eighty Rupees Only/i)).not.toBeInTheDocument();
  });

  it('preserves previous valid totals while background recalculation is pending', async () => {
    const user = userEvent.setup();
    const pendingPreview = deferred<CalculatedQuotationTotals>();
    vi.mocked(quotationsApi.calculatePreviewRequest)
      .mockResolvedValueOnce(mockTotals('1180.00'))
      .mockReturnValueOnce(pendingPreview.promise);

    renderQuotationForm();
    await waitForPreviewCalls(1);
    expect(await screen.findByText(/One Thousand One Hundred Eighty Rupees Only/i)).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/Quantity/i));
    await user.type(screen.getByLabelText(/Quantity/i), '2');
    await waitForPreviewCalls(2);

    expect(screen.getByText(/One Thousand One Hundred Eighty Rupees Only/i)).toBeInTheDocument();
    expect(screen.getByText(/Updating totals from the latest inputs/i)).toBeInTheDocument();
  });

  it('applies valid-until date constraints and clears invalid existing values when quotation date moves later', async () => {
    renderQuotationForm({ quotationDate: '2026-04-15', validUntil: '2026-04-20' });

    expect(screen.getByLabelText(/Valid Until/i)).toHaveAttribute('min', '2026-04-15');

    await userEvent.clear(screen.getByLabelText(/Quotation Date/i));
    await userEvent.type(screen.getByLabelText(/Quotation Date/i), '2026-04-25');

    await waitFor(() => {
      expect(screen.getByLabelText(/Valid Until/i)).toHaveValue('');
      expect(screen.getByLabelText(/Valid Until/i)).toHaveAttribute('min', '2026-04-25');
    });
  });

  it('rejects validUntil earlier than quotationDate in frontend schema', () => {
    const result = quotationFormSchema.safeParse({
      companyId: 1,
      quotationDate: '2026-04-20',
      validUntil: '2026-04-19',
      currency: 'INR',
      taxMode: 'CGST_SGST',
      quotationDiscountType: 'NONE',
      quotationDiscountValue: 0,
      freightAmount: 0,
      otherCharges: 0,
      items: [validFormItem('SS Reactor Tank', 0)],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.validUntil).toContain(
        'Valid Until cannot be earlier than the Quotation Date.',
      );
    }
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

function renderQuotationForm(overrides: Partial<QuotationFormSubmitValues> = {}) {
  return renderWithProviders(
    <QuotationForm
      initialValues={{
        companyId: 1,
        quotationDate: '2026-04-15',
        validUntil: '2026-05-15',
        currency: 'INR',
        taxMode: 'CGST_SGST',
        quotationDiscountType: 'NONE',
        quotationDiscountValue: 0,
        freightAmount: 0,
        otherCharges: 0,
        items: [validFormItem('SS Reactor Tank', 0)],
        ...overrides,
      }}
      onCancel={vi.fn()}
      onSubmit={vi.fn()}
    />,
  );
}

function validFormItem(itemName: string, sortOrder: number) {
  return {
    itemId: null,
    lineNumber: sortOrder + 1,
    itemName,
    description: '',
    measurementUnit: 'NOS',
    quantity: 1,
    unitRate: 1000,
    discountType: 'NONE' as const,
    discountValue: 0,
    gstRate: 18,
    sortOrder,
  };
}

function mockTotals(grandTotal: string, amountInWords = 'One Thousand One Hundred Eighty Rupees Only'): CalculatedQuotationTotals {
  return {
    subtotal: '1000.00',
    itemDiscountAmount: '0.00',
    quotationDiscountType: 'NONE',
    quotationDiscountValue: '0.00',
    quotationDiscountAmount: '0.00',
    taxableAmount: '1000.00',
    cgstAmount: '90.00',
    sgstAmount: '90.00',
    igstAmount: '0.00',
    freightAmount: '0.00',
    otherCharges: '0.00',
    roundOffAmount: '0.00',
    grandTotal,
    amountInWords,
    items: [
      {
        lineNumber: 1,
        itemId: null,
        itemCodeSnapshot: null,
        itemNameSnapshot: 'SS Reactor Tank',
        descriptionSnapshot: null,
        specificationsSnapshot: null,
        measurementUnitSnapshot: 'NOS',
        quantity: '1.000',
        unitRate: '1000.00',
        discountType: 'NONE',
        discountValue: '0.00',
        discountAmount: '0.00',
        baseAmount: '1000.00',
        taxableAmount: '1000.00',
        gstRate: '18.00',
        cgstAmount: '90.00',
        sgstAmount: '90.00',
        igstAmount: '0.00',
        taxAmount: '180.00',
        lineTotal: grandTotal,
        sortOrder: 0,
      },
    ],
  };
}

async function waitForPreviewCalls(count: number) {
  await waitFor(() => expect(quotationsApi.calculatePreviewRequest).toHaveBeenCalledTimes(count), {
    timeout: 2000,
  });
}
