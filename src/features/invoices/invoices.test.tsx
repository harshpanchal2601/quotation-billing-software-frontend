import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
vi.mock('@shared/tenancy/useFirmId', () => ({ useFirmId: () => 1 }));
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PERMISSIONS } from '@features/auth';
import { AccessRoute } from '@app/router/guards/AccessRoute';
import { BillingSettingsPage } from './pages/BillingSettingsPage';
import { CustomFieldsForm } from './components/CustomFieldsForm';
import { OrderInvoiceConversion } from './components/OrderInvoiceConversion';
import { QuotationInvoiceConversion } from './components/QuotationInvoiceConversion';
import { InvoiceDetailsPage } from './pages/InvoiceDetailsPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { InvoiceEditorPage } from './pages/InvoicesPage';
import { NotificationProvider } from '@shared/ui/feedback';
import { invoicesQueryKeys } from './model/invoices.query-keys';
import * as api from './api/invoices.api';
import { createCompanyAddressRequest } from '../companies/api/addresses.api';
import type { CustomerOption, CustomValues, InvoiceDocument, SettingsResponse } from './model/invoices.types';
import type { SalesOrder } from '@features/sales-orders';

const access = vi.hoisted(() => ({ permissions: new Set<string>(), entitled: true }));
vi.mock('@features/auth', async (original) => ({ ...(await original<typeof import('@features/auth')>()), useHasPermission: (...values: string[]) => values.some((value) => access.permissions.has(value)), useAuth: () => ({ user: { id: 1, accountType: 'FIRM_USER', firmId: 1, permissions: [...access.permissions], mustChangePassword: false } }) }));
vi.mock('@shared/tenancy/entitlements', async (original) => ({ ...(await original<typeof import('@shared/tenancy/entitlements')>()), useEntitlements: () => ({ isPending: false, isError: false, data: { permissions: Object.fromEntries([...access.permissions].map((permission) => [permission, access.entitled])) } }) }));
vi.mock('./model/invoices.query-keys', async (original) => ({ ...(await original<typeof import('./model/invoices.query-keys')>()), useBillingFirmId: () => 1 }));
vi.mock('./api/invoices.api');
vi.mock('../companies/api/addresses.api', () => ({ createCompanyAddressRequest: vi.fn() }));
vi.mock('@features/payments', () => ({ InvoiceSettlementPanel: () => null }));
const settings: SettingsResponse = { version: 3, states: { '24': 'Gujarat', '27': 'Maharashtra' }, config: { schemaVersion: 1, registration: 'REGULAR', sellerStateCode: '24', einvoiceRequired: false, prefixes: { INVOICE: 'INV', PROFORMA: 'PF', CREDIT_NOTE: 'CN', DEBIT_NOTE: 'DN' }, template: 'STANDARD', primaryColour: '#168A56', paymentInstructions: '', termsAndConditions: '', customFields: [{ key: 'cf_order', label: 'Purchase order', type: 'TEXT', required: true, showOnPdf: true, width: 'FULL', options: [] }] } };
const document: InvoiceDocument = {
  id: 11, firmId: 1, kind: 'INVOICE', status: 'ISSUED', version: 2, documentNumber: 'INV/2627/000001', companyId: 1, invoiceDate: '2026-10-27', dueDate: null, currency: 'INR', customerReference: null, paymentTerms: null, notes: null,
  buyerSnapshot: { name: 'Historical customer', legalName: null, gstin: null, billingAddress: { addressLine1: 'Address', city: 'Ahmedabad', state: 'Gujarat', postalCode: '380001', country: 'India' }, shippingAddress: null }, sellerSnapshot: { legalName: 'Historical supplier', gstin: 'fixture', stateName: 'Gujarat' }, bankSnapshot: null,
  financialPolicySnapshot: { taxMode: 'CGST_SGST', localTaxLabel: 'SGST', registration: 'REGULAR', sellerStateCode: '24' }, supplySnapshot: { isExempt: false, placeOfSupplyStateCode: '24', placeOfSupplyBasis: 'GOODS_MOVEMENT', explanation: '' }, customFieldSchema: settings.config.customFields, customFieldValues: { cf_order: 'PO-ISSUED' }, presentationSnapshot: settings.config,
  sourceSnapshot: null, sourceQuotationId: null, sourceProformaId: null, sourceInvoiceId: null, adjustmentReason: null, subtotal: '100.00', discountAmount: '0.00', taxableAmount: '100.00', taxAmount: '18.00', roundOffAmount: '0.00', grandTotal: '118.00', lines: [], statusHistory: [], postingEffect: 'DEBIT', issuedAt: '2026-10-27T00:00:00Z', voidedAt: null, voidReason: null,
};
const order: SalesOrder = {
  id: 5, version: 3, orderNumber: 'SO-000005', status: 'PARTIALLY_FULFILLED', companyId: 1, sourceQuotationId: 7, currency: 'INR',
  snapshot: { quotationNumber: 'QUOTE-000007', revisionNumber: 2, companyName: 'Accepted customer', grandTotal: '75.00', taxMode: 'NONE', paymentTerms: null, termsAndConditions: null },
  lines: [{ id: 9, lineNumber: 1, quantity: '3.000', fulfilled: '1.000', reserved: '0.000', available: '1.000', snapshot: { itemName: 'Accepted service', measurementUnit: 'HOUR', unitRate: '25.00', kind: 'SERVICE' } }],
  fulfillments: [], history: [], invoices: [], pagination: { history: { page: 1, limit: 20, total: 0 }, completions: { page: 1, limit: 20, total: 0 }, invoices: { page: 1, limit: 20, total: 0 } },
};
const quotation = { id: 7, quotationNumber: 'QUOTE-000007', revisionNumber: 2, taxMode: 'NONE', items: [{ lineNumber: 1, itemNameSnapshot: 'Accepted service' }] };
function wrap(ui: React.ReactNode, route: string | { pathname: string; state?: unknown } = '/') { const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } }); return render(<QueryClientProvider client={client}><NotificationProvider><MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter></NotificationProvider></QueryClientProvider>); }
beforeEach(() => {
  vi.clearAllMocks(); access.permissions = new Set(Object.values(PERMISSIONS)); access.entitled = true;
  vi.mocked(api.getBillingCustomers).mockResolvedValue([]);
  vi.mocked(api.getBillingAddresses).mockResolvedValue([]);
  vi.mocked(api.getBillingSettings).mockResolvedValue(structuredClone(settings));
  vi.mocked(api.getBillingDocument).mockResolvedValue(structuredClone(document));
  vi.mocked(api.listBillingPdfs).mockResolvedValue([]);
  vi.mocked(api.listBillingDocuments).mockResolvedValue({ documents: [structuredClone(document)], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } });
});
describe('billing customization and access', () => {
  it('retains service metadata and exact order quantities through unchanged retries and edited commands', async () => {
    vi.mocked(api.getBillingSettings).mockResolvedValue({ ...settings, config: { ...settings.config, registration: 'UNREGISTERED', customFields: [] } });
    vi.mocked(api.convertSalesOrderToInvoice).mockRejectedValueOnce(new Error('Response lost')).mockRejectedValueOnce(new Error('Response lost')).mockResolvedValueOnce({ ...document, id: 22, status: 'DRAFT' });
    const close = vi.fn();
    wrap(<Routes><Route path="/source" element={<OrderInvoiceConversion order={order} onClose={close} />} /><Route path="/invoices/:id" element={<span>Created order invoice</span>} /></Routes>, '/source');
    const form = within(await screen.findByRole('dialog', { name: 'Invoice completed order quantities' }));
    await waitFor(() => expect(form.getByRole('option', { name: '24 — Gujarat' })).toBeInTheDocument());
    await userEvent.selectOptions(form.getByRole('combobox', { name: /Place of supply state/ }), '24');
    expect(form.getByRole('combobox', { name: 'Place of supply rule' })).toHaveValue('SERVICES_GENERAL');
    expect(form.getByRole('combobox', { name: 'Supply type' })).toHaveValue('SERVICE');
    const save = form.getByRole('button', { name: 'Create invoice draft' });
    const quantity = form.getByRole('textbox', { name: 'Quantity to invoice' });
    expect(save).toBeDisabled();
    fireEvent.change(quantity, { target: { value: '0.000' } });
    expect(save).toBeDisabled();
    fireEvent.change(quantity, { target: { value: '0.003' } });
    await userEvent.click(save);
    await waitFor(() => expect(api.convertSalesOrderToInvoice).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(save).toBeEnabled());
    await userEvent.click(save);
    await waitFor(() => expect(api.convertSalesOrderToInvoice).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(save).toBeEnabled());
    expect(vi.mocked(api.convertSalesOrderToInvoice).mock.calls[0]![0]).toEqual(vi.mocked(api.convertSalesOrderToInvoice).mock.calls[1]![0]);
    fireEvent.change(quantity, { target: { value: '0.004' } });
    await userEvent.click(save);
    expect(await screen.findByText('Created order invoice')).toBeInTheDocument();
    expect(close).toHaveBeenCalledTimes(1);
    const first = vi.mocked(api.convertSalesOrderToInvoice).mock.calls[0]![0];
    const changed = vi.mocked(api.convertSalesOrderToInvoice).mock.calls[2]![0];
    expect(first.lines).toEqual([{ salesOrderLineId: 9, quantity: '0.003', hsnCode: null, supplyType: 'SERVICE' }]);
    expect(changed.lines).toEqual([{ salesOrderLineId: 9, quantity: '0.004', hsnCode: null, supplyType: 'SERVICE' }]);
    expect(changed.idempotencyKey).not.toBe(first.idempotencyKey);
    expect(order.lines[0]!.available).toBe('1.000');
    expect(screen.getByRole('status')).toHaveTextContent('Invoice draft created.');
  });
  it('keeps quotation retry identity for the same metadata and changes it when source-line metadata is edited', async () => {
    vi.mocked(api.getBillingSettings).mockResolvedValue({ ...settings, config: { ...settings.config, customFields: [] } });
    vi.mocked(api.convertQuotationToInvoice).mockRejectedValueOnce(new Error('Response lost')).mockRejectedValueOnce(new Error('Response lost')).mockResolvedValueOnce({ ...document, id: 23, status: 'DRAFT' });
    const close = vi.fn();
    wrap(<Routes><Route path="/source" element={<QuotationInvoiceConversion source={quotation} onClose={close} />} /><Route path="/invoices/:id" element={<span>Created quotation invoice</span>} /></Routes>, '/source');
    const form = within(await screen.findByRole('dialog', { name: 'Create invoice from accepted quotation' }));
    await waitFor(() => expect(form.getByRole('option', { name: '24 — Gujarat' })).toBeInTheDocument());
    await userEvent.selectOptions(form.getByRole('combobox', { name: /Place of supply state/ }), '24');
    await userEvent.selectOptions(form.getByRole('combobox', { name: 'Supply type' }), 'SERVICE');
    fireEvent.change(form.getByRole('textbox', { name: /HSN \/ SAC/ }), { target: { value: '9983' } });
    const save = form.getByRole('button', { name: 'Create invoice draft' });
    await userEvent.click(save);
    await waitFor(() => expect(api.convertQuotationToInvoice).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(save).toBeEnabled());
    await userEvent.click(save);
    await waitFor(() => expect(api.convertQuotationToInvoice).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(save).toBeEnabled());
    expect(vi.mocked(api.convertQuotationToInvoice).mock.calls[0]![0]).toEqual(vi.mocked(api.convertQuotationToInvoice).mock.calls[1]![0]);
    fireEvent.change(form.getByRole('textbox', { name: /HSN \/ SAC/ }), { target: { value: '998311' } });
    await userEvent.click(save);
    expect(await screen.findByText('Created quotation invoice')).toBeInTheDocument();
    const first = vi.mocked(api.convertQuotationToInvoice).mock.calls[0]![0];
    const changed = vi.mocked(api.convertQuotationToInvoice).mock.calls[2]![0];
    expect(changed).toEqual(expect.objectContaining({ sourceRevisionId: 7, lineMetadata: [{ lineNumber: 1, hsnCode: '998311', supplyType: 'SERVICE' }] }));
    expect(changed.idempotencyKey).not.toBe(first.idempotencyKey);
    expect(close).toHaveBeenCalledTimes(1);
  });
  it.each(['order', 'quotation'] as const)('keeps a successful %s conversion on its source page when the creator cannot view invoices', async (kind) => {
    access.permissions.delete(PERMISSIONS.INVOICES_VIEW);
    vi.mocked(api.getBillingSettings).mockResolvedValue({ ...settings, config: { ...settings.config, registration: 'UNREGISTERED', customFields: [] } });
    vi.mocked(api.convertSalesOrderToInvoice).mockResolvedValue({ ...document, id: 22, status: 'DRAFT' });
    vi.mocked(api.convertQuotationToInvoice).mockResolvedValue({ ...document, id: 23, status: 'DRAFT' });
    function Source() { const [open, setOpen] = useState(true); return <><span>Source records</span>{open ? kind === 'order' ? <OrderInvoiceConversion order={order} onClose={() => setOpen(false)} /> : <QuotationInvoiceConversion source={quotation} onClose={() => setOpen(false)} /> : null}</>; }
    wrap(<Routes><Route path="/source" element={<Source />} /><Route path="/invoices/:id" element={<span>Unauthorized invoice destination</span>} /></Routes>, '/source');
    const form = within(await screen.findByRole('dialog'));
    await waitFor(() => expect(form.getByRole('option', { name: '24 — Gujarat' })).toBeInTheDocument());
    await userEvent.selectOptions(form.getByRole('combobox', { name: /Place of supply state/ }), '24');
    if (kind === 'order') fireEvent.change(form.getByRole('textbox', { name: 'Quantity to invoice' }), { target: { value: '0.003' } });
    await userEvent.click(form.getByRole('button', { name: 'Create invoice draft' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Source records')).toBeInTheDocument();
    expect(screen.queryByText('Unauthorized invoice destination')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Invoice draft created.');
  });
  it('protects adjustment edits and reuses retry identity only for the unchanged financial payload', async () => {
    vi.mocked(api.getBillingDocument).mockResolvedValue({ ...document, lines: [{ lineNumber: 1, itemId: null, itemCode: null, itemName: 'QA service', description: '', hsnCode: '9983', supplyType: 'SERVICE', measurementUnit: 'HOUR', quantity: '1', unitRate: '100.00', discountType: 'NONE', discountValue: '0', taxRate: '18', baseAmount: '100.00', discountAmount: '0', taxableAmount: '100.00', cgstAmount: '9.00', sgstAmount: '9.00', igstAmount: '0', taxAmount: '18.00', lineTotal: '118.00' }] });
    vi.mocked(api.createBillingAdjustment).mockRejectedValueOnce(new Error('Response lost')).mockRejectedValueOnce(new Error('Response lost')).mockResolvedValueOnce({ ...document, id: 22, kind: 'CREDIT_NOTE', status: 'DRAFT' });
    wrap(<Routes><Route path="/invoices/:id" element={<InvoiceDetailsPage />} /><Route path="/billing-adjustments/:id" element={<span>Created adjustment</span>} /></Routes>, '/invoices/11');
    await userEvent.click(await screen.findByRole('button', { name: 'Create credit / debit note' }));
    const form = within(screen.getByRole('dialog', { name: /Create adjustment against/ }));
    fireEvent.change(form.getByRole('textbox', { name: /Reason/ }), { target: { value: 'QA price correction' } });
    await userEvent.click(form.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('dialog', { name: 'Discard unsaved changes?' })).toBeInTheDocument();
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Discard unsaved changes?' })).getByRole('button', { name: 'Keep editing' }));
    await userEvent.click(await form.findByRole('checkbox', { name: '1. QA service' }));
    const save = form.getByRole('button', { name: 'Create adjustment draft' });
    await userEvent.click(save);
    await waitFor(() => expect(api.createBillingAdjustment).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(save).toBeEnabled());
    expect(form.getByRole('textbox', { name: /Reason/ })).toHaveValue('QA price correction');
    await userEvent.click(save);
    await waitFor(() => expect(api.createBillingAdjustment).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(save).toBeEnabled());
    expect(vi.mocked(api.createBillingAdjustment).mock.calls[0]![0]).toEqual(vi.mocked(api.createBillingAdjustment).mock.calls[1]![0]);
    fireEvent.change(form.getByRole('textbox', { name: 'Adjustment unit rate' }), { target: { value: '25.10' } });
    await userEvent.click(save);
    expect(await screen.findByText('Created adjustment')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Adjustment draft created.');
    const first = vi.mocked(api.createBillingAdjustment).mock.calls[0]![0];
    const changed = vi.mocked(api.createBillingAdjustment).mock.calls[2]![0];
    expect(changed.idempotencyKey).not.toBe(first.idempotencyKey);
    expect(changed.lines).toEqual([{ sourceLineNumber: 1, quantity: '1', unitRate: '25.10' }]);
  });
  it('retains failed issuance confirmation and closes it with feedback only after successful retry', async () => {
    const draft = { ...document, status: 'DRAFT' as const, version: 1, documentNumber: null };
    vi.mocked(api.getBillingDocument).mockResolvedValue(draft);
    vi.mocked(api.issueBillingDocument).mockRejectedValueOnce(new Error('Issuance unavailable')).mockImplementationOnce(async () => {
      vi.mocked(api.getBillingDocument).mockResolvedValue(document);
      return document;
    });
    wrap(<Routes><Route path="/invoices/:id" element={<InvoiceDetailsPage />} /></Routes>, '/invoices/11');
    await userEvent.click(await screen.findByRole('button', { name: 'Issue invoice' }));
    const confirmation = screen.getByRole('dialog');
    await userEvent.click(within(confirmation).getByRole('button', { name: 'Confirm issuance' }));
    await waitFor(() => expect(api.issueBillingDocument).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(within(confirmation).getByRole('button', { name: 'Confirm issuance' })).toBeEnabled());
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByText('Document issued.')).not.toBeInTheDocument();
    await userEvent.click(within(confirmation).getByRole('button', { name: 'Confirm issuance' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Document issued.')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: document.documentNumber! })).toBeInTheDocument();
    expect(api.issueBillingDocument).toHaveBeenCalledTimes(2);
  });
  it('resolves an assistant customer outside the options page and saves the original customer and exact lines', async () => {
    const selected = { id: 125, name: 'Outside first page customer', gstin: null };
    const lines = [{ itemId: null, itemName: 'Extracted service', quantity: '1.125', unitRate: '900719925474099.001', taxRate: '0', measurementUnit: 'HOUR', supplyType: 'SERVICE', discountType: 'NONE', discountValue: '0', hsnCode: '9983' }];
    let hydrate!: (customers: CustomerOption[]) => void;
    vi.mocked(api.getBillingSettings).mockResolvedValue({ ...settings, config: { ...settings.config, registration: 'UNREGISTERED', customFields: [] } });
    vi.mocked(api.getBillingCustomers).mockImplementation(async (_scope, _search, _signal, selectedId) => selectedId === selected.id ? new Promise((resolve) => { hydrate = resolve; }) : Array.from({ length: 30 }, (_, index) => ({ id: index + 1, name: `Customer ${index + 1}`, gstin: null })));
    vi.mocked(api.getBillingAddresses).mockResolvedValue([{ id: 1250, addressLine1: 'Selected customer road', city: 'Ahmedabad', state: 'Gujarat', postalCode: '380001', country: 'India' }]);
    vi.mocked(api.createBillingDraft).mockResolvedValue({ ...document, id: 125, status: 'DRAFT', companyId: selected.id });
    wrap(<Routes><Route path="/invoices/new" element={<InvoiceEditorPage />} /><Route path="/invoices" element={<span>Saved invoice records</span>} /></Routes>, { pathname: '/invoices/new', state: { source: 'assistant', firmId: 1, actorId: 1, kind: 'INVOICE', companyId: selected.id, lines } });
    expect(await screen.findByRole('textbox', { name: 'Description / name' })).toHaveValue('Extracted service');
    expect(await screen.findByText('Loading selected customer…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
    await waitFor(() => expect(api.getBillingCustomers).toHaveBeenCalledWith('invoices', '', expect.any(AbortSignal), selected.id));
    await act(async () => { hydrate([selected]); });
    await waitFor(() => expect(screen.getByRole('combobox', { name: /Customer/ })).toHaveValue(selected.name));
    expect(vi.mocked(api.getBillingCustomers).mock.calls.some((call) => call[1] === selected.name)).toBe(false);
    await userEvent.click(screen.getByRole('combobox', { name: /Billing address/ }));
    await userEvent.click(screen.getByRole('option', { name: 'Selected customer road, Ahmedabad, Gujarat' }));
    await userEvent.click(screen.getByRole('combobox', { name: /Place of supply state/ }));
    await userEvent.click(screen.getByRole('option', { name: '24 — Gujarat' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(api.createBillingDraft).toHaveBeenCalledWith('invoices', expect.objectContaining({ companyId: selected.id, billingAddressId: 1250, lines, idempotencyKey: expect.any(String) })));
    expect(await screen.findByText('Saved invoice records')).toBeInTheDocument();
  });
  it.each(['invoices', 'proformas'] as const)('keeps the selected %s customer while searches and the exact lookup are pending', async (scope) => {
    const selected = { id: 125, name: 'Outside customer', gstin: null };
    let hydrate!: (customers: CustomerOption[]) => void;
    vi.mocked(api.getBillingCustomers).mockImplementation(async (_scope, search, _signal, selectedId) => selectedId === selected.id ? new Promise((resolve) => { hydrate = resolve; }) : search === 'Outside' ? [selected] : []);
    wrap(<InvoiceEditorPage scope={scope} />, `/${scope}/new`);
    const customer = await screen.findByRole('combobox', { name: /Customer/ });
    await userEvent.type(customer, 'Outside');
    await userEvent.click(await screen.findByRole('option', { name: selected.name }));
    expect(customer).toHaveValue(selected.name);
    await waitFor(() => expect(api.getBillingCustomers).toHaveBeenCalledWith(scope, '', expect.any(AbortSignal), selected.id));
    expect(vi.mocked(api.getBillingCustomers).mock.calls.some((call) => call[1] === selected.name)).toBe(false);
    fireEvent.change(customer, { target: { value: 'Other search' } });
    await waitFor(() => expect(api.getBillingCustomers).toHaveBeenCalledWith(scope, 'Other search', expect.any(AbortSignal)));
    fireEvent.blur(customer);
    await waitFor(() => expect(customer).toHaveValue(selected.name));
    await act(async () => { hydrate([selected]); });
    expect(customer).toHaveValue(selected.name);
    expect(api.createBillingDraft).not.toHaveBeenCalled();
  });
  it.each(['invoices', 'proformas'] as const)('preserves the %s edit snapshot while resolving its selected customer outside the options page', async (scope) => {
    const selected = { id: 125, name: 'Current selected customer', gstin: null };
    let hydrate!: (customers: CustomerOption[]) => void;
    vi.mocked(api.getBillingCustomers).mockImplementation(async (_scope, _search, _signal, selectedId) => selectedId === selected.id ? new Promise((resolve) => { hydrate = resolve; }) : []);
    vi.mocked(api.getBillingDocument).mockResolvedValue({ ...document, kind: scope === 'proformas' ? 'PROFORMA' : 'INVOICE', status: 'DRAFT', companyId: selected.id, buyerSnapshot: { ...document.buyerSnapshot, billingAddress: { ...document.buyerSnapshot.billingAddress, id: 1250 } } });
    wrap(<Routes><Route path={`/${scope}/:id/edit`} element={<InvoiceEditorPage scope={scope} editing />} /></Routes>, `/${scope}/11/edit`);
    const customer = await screen.findByRole('combobox', { name: /Customer/ });
    expect(customer).toHaveValue('Historical customer');
    expect(screen.getByRole('combobox', { name: /Billing address/ })).toHaveTextContent('Address, Ahmedabad, Gujarat');
    await waitFor(() => expect(api.getBillingCustomers).toHaveBeenCalledWith(scope, '', expect.any(AbortSignal), selected.id));
    await act(async () => { hydrate([selected]); });
    await waitFor(() => expect(customer).toHaveValue(selected.name));
    expect(screen.getByRole('combobox', { name: /Billing address/ })).toHaveTextContent('Address, Ahmedabad, Gujarat');
    expect(vi.mocked(api.getBillingCustomers).mock.calls.some((call) => call[1] === selected.name || call[1] === 'Historical customer')).toBe(false);
    expect(api.updateBillingDraft).not.toHaveBeenCalled();
  });
  it('retains assistant lines and offers a selected-customer retry without enabling an unavailable customer', async () => {
    let attempts = 0;
    vi.mocked(api.getBillingCustomers).mockImplementation(async (_scope, _search, _signal, selectedId) => {
      if (!selectedId) return [];
      if (attempts++ === 0) throw new Error('Customer lookup unavailable');
      return [];
    });
    wrap(<InvoiceEditorPage />, { pathname: '/invoices/new', state: { source: 'assistant', firmId: 1, actorId: 1, kind: 'INVOICE', companyId: 125, lines: [{ itemId: null, itemName: 'Keep extracted line', quantity: '1', unitRate: '25.10', taxRate: '0', measurementUnit: 'PCS', supplyType: 'GOODS', discountType: 'NONE', discountValue: '0' }] } });
    await userEvent.click(await screen.findByRole('button', { name: 'Retry selected customer' }));
    expect(await screen.findByText('The selected customer is unavailable. Choose an active customer before saving this draft.')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Description / name' })).toHaveValue('Keep extracted line');
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
    expect(api.createBillingDraft).not.toHaveBeenCalled();
  });
  it.each(['invoices', 'proformas'] as const)('closes the %s editor to a saved confirmation when its creator cannot view the list', async (scope) => {
    access.permissions = new Set([scope === 'proformas' ? PERMISSIONS.PROFORMAS_MANAGE : PERMISSIONS.INVOICES_CREATE]);
    vi.mocked(api.getBillingSettings).mockResolvedValue({ ...settings, config: { ...settings.config, registration: 'UNREGISTERED', customFields: [] } });
    vi.mocked(api.getBillingCustomers).mockResolvedValue([{ id: 125, name: 'Create-only customer', gstin: null }]);
    vi.mocked(api.getBillingAddresses).mockResolvedValue([{ id: 1250, addressLine1: 'Selected customer road', city: 'Ahmedabad', state: 'Gujarat', postalCode: '380001', country: 'India' }]);
    vi.mocked(api.createBillingDraft).mockResolvedValue({ ...document, id: 125, kind: scope === 'proformas' ? 'PROFORMA' : 'INVOICE', status: 'DRAFT', documentNumber: null, companyId: 125 });
    wrap(<Routes><Route path={`/${scope}/new`} element={<InvoiceEditorPage scope={scope} />} /><Route path={`/${scope}`} element={<span>Forbidden document list</span>} /></Routes>, `/${scope}/new`);
    await userEvent.type(await screen.findByRole('combobox', { name: /Customer/ }), 'Create-only');
    await userEvent.click(await screen.findByRole('option', { name: 'Create-only customer' }));
    await userEvent.click(screen.getByRole('combobox', { name: /Billing address/ }));
    await userEvent.click(screen.getByRole('option', { name: 'Selected customer road, Ahmedabad, Gujarat' }));
    await userEvent.click(screen.getByRole('combobox', { name: /Place of supply state/ }));
    await userEvent.click(screen.getByRole('option', { name: '24 — Gujarat' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Description / name' }), { target: { value: 'Reviewed line' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'HSN / SAC' }), { target: { value: '8479' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Unit rate' }), { target: { value: '25.50' } });
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(await screen.findByRole('heading', { name: `${scope === 'proformas' ? 'Proforma' : 'Invoice'} draft saved` })).toBeInTheDocument();
    expect(screen.queryByText('Forbidden document list')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save draft' })).not.toBeInTheDocument();
    expect(screen.getByText('Draft #125')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('draft saved.');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Create another draft' })).toBeEnabled());
    await userEvent.click(screen.getByRole('button', { name: 'Create another draft' }));
    expect(await screen.findByRole('textbox', { name: 'Description / name' })).toHaveValue('');
    expect(screen.getByRole('combobox', { name: /Customer/ })).toHaveValue('');
    expect(api.createBillingDraft).toHaveBeenCalledTimes(1);
  });
  it('creates an address without submitting or losing the surrounding invoice draft', async () => {
    vi.mocked(api.getBillingCustomers).mockResolvedValue([{ id: 1, name: 'QA customer', gstin: null }]);
    vi.mocked(api.getBillingAddresses).mockResolvedValue([]);
    vi.mocked(createCompanyAddressRequest).mockResolvedValue({ id: 9, addressType: 'BILLING', addressLine1: 'New billing address', addressLine2: null, city: 'Ahmedabad', state: 'Gujarat', postalCode: '380001', country: 'India', isPrimary: false, createdAt: '', updatedAt: '' });
    wrap(<InvoiceEditorPage />, '/invoices/new');
    await userEvent.type(await screen.findByRole('combobox', { name: /Customer/ }), 'QA');
    await userEvent.click(await screen.findByRole('option', { name: 'QA customer' }));
    expect(await screen.findByText(/This customer has no saved addresses/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Customer reference' }), { target: { value: 'REF-RETAINED' } });
    await userEvent.click(screen.getByRole('button', { name: 'Add customer address' }));
    fireEvent.change(screen.getByRole('textbox', { name: /Address line 1/ }), { target: { value: 'New billing address' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save address' })).toBeEnabled());
    await userEvent.click(screen.getByRole('button', { name: 'Save address' }));
    await waitFor(() => expect(createCompanyAddressRequest).toHaveBeenCalledWith(1, expect.objectContaining({ addressType: 'BILLING', addressLine1: 'New billing address' })));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Add address' })).not.toBeInTheDocument());
    expect(screen.getByRole('textbox', { name: 'Customer reference' })).toHaveValue('REF-RETAINED');
    expect(screen.getByRole('combobox', { name: /Billing address/ })).toHaveTextContent('New billing address');
    expect(api.createBillingDraft).not.toHaveBeenCalled();
  });
  it('saves exact draft fields, preserves optimistic versioning and returns to records with feedback', async () => {
    const draft: InvoiceDocument = { ...document, status: 'DRAFT', buyerSnapshot: { ...document.buyerSnapshot, billingAddress: { ...document.buyerSnapshot.billingAddress, id: 9 } }, lines: [{ lineNumber: 1, itemId: null, itemCode: null, itemName: 'Service', description: '', hsnCode: '9983', supplyType: 'SERVICE', measurementUnit: 'HOUR', quantity: '0.003', unitRate: '9007199254740993.001', discountType: 'NONE', discountValue: '0', taxRate: '18', baseAmount: '0', discountAmount: '0', taxableAmount: '0', cgstAmount: '0', sgstAmount: '0', igstAmount: '0', taxAmount: '0', lineTotal: '0' }] };
    vi.mocked(api.getBillingDocument).mockResolvedValue(draft);
    vi.mocked(api.getBillingCustomers).mockResolvedValue([{ id: 1, name: 'Historical customer', gstin: null }]);
    vi.mocked(api.getBillingAddresses).mockResolvedValue([draft.buyerSnapshot.billingAddress]);
    vi.mocked(api.updateBillingDraft).mockResolvedValue({ ...draft, version: 3, notes: 'Reviewed draft' });
    wrap(<Routes><Route path="/invoices/:id/edit" element={<InvoiceEditorPage editing />} /><Route path="/invoices" element={<span>Invoice records</span>} /></Routes>, '/invoices/11/edit');
    const save = await screen.findByRole('button', { name: 'Save draft' });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: 'Document notes' }), { target: { value: 'Reviewed draft' } });
    expect(screen.getByLabelText(/Due date/)).toHaveAttribute('min', '2026-10-27');
    await userEvent.click(save);
    await waitFor(() => expect(api.updateBillingDraft).toHaveBeenCalledWith('invoices', 11, expect.objectContaining({ expectedVersion: 2, refreshCustomFields: false, notes: 'Reviewed draft', lines: [expect.objectContaining({ quantity: '0.003', unitRate: '9007199254740993.001' })] })));
    expect(await screen.findByText('Invoice records')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Invoice draft saved.');
  });
  it('lets delegated field designers edit fields while hiding fiscal controls', async () => {
    access.permissions = new Set([PERMISSIONS.INVOICE_FIELDS_MANAGE, PERMISSIONS.INVOICES_VIEW]);
    wrap(<BillingSettingsPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Edit invoice fields' }));
    expect(screen.getByRole('button', { name: 'Add custom field' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Registration type')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Manage roles' })).not.toBeInTheDocument();
    const input = screen.getByLabelText('Field label', { exact: false });
    fireEvent.change(input, { target: { value: 'Client purchase order' } });
    vi.mocked(api.saveInvoiceFields).mockResolvedValue(settings);
    await userEvent.click(screen.getByRole('button', { name: 'Save custom fields' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm and save' }));
    await waitFor(() => expect(api.saveInvoiceFields).toHaveBeenCalledWith(3, [expect.objectContaining({ key: 'cf_order', label: 'Client purchase order' })]));
    expect(api.saveBillingSettings).not.toHaveBeenCalled();
  });
  it('refreshes read metadata after a partial settings save response without changing custom fields or financial choices', async () => {
    wrap(<BillingSettingsPage />);
    const fieldsButton = await screen.findByRole('button', { name: 'Edit invoice fields' });
    await userEvent.click(screen.getByRole('button', { name: 'Edit tax and document defaults' }));
    expect(fieldsButton).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Default payment instructions'), { target: { value: 'QA reviewed instructions' } });
    const updated = { ...settings, version: 4, config: { ...settings.config, paymentInstructions: 'QA reviewed instructions' } };
    vi.mocked(api.saveBillingSettings).mockResolvedValue({ version: updated.version, config: updated.config });
    vi.mocked(api.getBillingSettings).mockResolvedValue(updated);
    await userEvent.click(screen.getByRole('button', { name: 'Save defaults' }));
    expect(api.saveBillingSettings).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Confirm and save' }));
    const { customFields, ...expected } = updated.config;
    await waitFor(() => expect(api.saveBillingSettings).toHaveBeenCalledWith(3, expected));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('QA reviewed instructions')).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Additional invoice fields' })).toHaveTextContent(customFields[0]!.label);
    expect(api.saveInvoiceFields).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('Billing defaults saved.');
  });
  it('does not grant field design to an invoice editor', async () => {
    access.permissions = new Set([PERMISSIONS.INVOICES_VIEW, PERMISSIONS.INVOICES_EDIT]);
    wrap(<Routes><Route path="/settings/billing" element={<AccessRoute permissions={[PERMISSIONS.INVOICE_FIELDS_MANAGE]}><span>Secret configuration</span></AccessRoute>} /><Route path="/invoices" element={<span>Invoice landing</span>} /></Routes>, '/settings/billing');
    expect(await screen.findByText('Invoice landing')).toBeInTheDocument(); expect(screen.queryByText('Secret configuration')).not.toBeInTheDocument();
  });
  it('denies a direct settings URL when the plan does not permit billing', async () => {
    access.entitled = false;
    wrap(<Routes><Route path="/settings/billing" element={<AccessRoute permissions={[PERMISSIONS.INVOICE_FIELDS_MANAGE]}><span>Secret configuration</span></AccessRoute>} /><Route path="/access-denied" element={<span>Plan denied</span>} /></Routes>, '/settings/billing');
    expect(await screen.findByText('Plan denied')).toBeInTheDocument();
  });
  it('shows stale-version conflicts without retrying or overwriting a newer configuration', async () => {
    vi.mocked(api.saveInvoiceFields).mockRejectedValue({ isAxiosError: true, response: { status: 409, data: { success: false, message: 'Billing configuration changed; reload before saving' } } });
    wrap(<BillingSettingsPage />); await userEvent.click(await screen.findByRole('button', { name: 'Edit invoice fields' })); const input = await screen.findByLabelText('Field label', { exact: false }); fireEvent.change(input, { target: { value: 'Changed locally' } });
    await userEvent.click(screen.getByRole('button', { name: 'Save custom fields' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm and save' }));
    expect(await within(await screen.findByRole('dialog', { name: 'Additional invoice fields' })).findByText('Billing configuration changed; reload before saving')).toBeInTheDocument(); expect(api.saveInvoiceFields).toHaveBeenCalledTimes(1);
  });
  it.each(['invoices', 'proformas', 'billing-adjustments'] as const)('omits an empty additional-values save action for %s', async (scope) => {
    vi.mocked(api.getBillingDocument).mockResolvedValue({ ...document, status: 'DRAFT', customFieldSchema: [], customFieldValues: {} });
    wrap(<Routes><Route path={`/${scope}/:id`} element={<InvoiceDetailsPage scope={scope} />} /></Routes>, `/${scope}/11`);
    expect(await screen.findByText('No additional fields are included in this document.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save additional/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit additional information' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review latest additional fields' })).toBeInTheDocument();
  });
  it('opens additional values deliberately, protects changed input and closes to the refreshed summary after save', async () => {
    const draft = { ...document, status: 'DRAFT' as const, version: 3 };
    vi.mocked(api.getBillingDocument).mockResolvedValue(draft);
    vi.mocked(api.updateCustomValues).mockImplementation(async () => {
      const saved = { ...draft, version: 4, customFieldValues: { cf_order: 'PO-NEW' } };
      vi.mocked(api.getBillingDocument).mockResolvedValue(saved);
      return saved;
    });
    wrap(<Routes><Route path="/invoices/:id" element={<InvoiceDetailsPage />} /></Routes>, '/invoices/11');
    expect(await screen.findByText('PO-ISSUED')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Edit additional information' }));
    const form = within(screen.getByRole('dialog', { name: 'Edit additional information' }));
    expect(form.getByRole('button', { name: 'Save additional information' })).toBeDisabled();
    fireEvent.change(form.getByRole('textbox', { name: /Purchase order/ }), { target: { value: 'PO-NEW' } });
    await userEvent.click(form.getByRole('button', { name: 'Cancel' }));
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Discard unsaved changes?' })).getByRole('button', { name: 'Keep editing' }));
    expect(await form.findByRole('textbox', { name: /Purchase order/ })).toHaveValue('PO-NEW');
    await userEvent.click(form.getByRole('button', { name: 'Save additional information' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(api.updateCustomValues).toHaveBeenCalledWith('invoices', draft, { cf_order: 'PO-NEW' });
    expect(await screen.findByText('PO-NEW')).toBeInTheDocument();
    expect(screen.getByText('Additional information saved.')).toBeInTheDocument();
  });
  it('keeps issued values read-only and hides draft actions', async () => {
    wrap(<Routes><Route path="/invoices/:id" element={<InvoiceDetailsPage />} /></Routes>, '/invoices/11');
    expect(await screen.findByText('PO-ISSUED')).toBeInTheDocument(); expect(screen.queryByRole('textbox', { name: /Purchase order/ })).not.toBeInTheDocument(); expect(screen.queryByRole('button', { name: 'Edit additional information' })).not.toBeInTheDocument(); expect(screen.queryByRole('button', { name: 'Edit draft' })).not.toBeInTheDocument(); expect(screen.queryByRole('button', { name: 'Save additional values' })).not.toBeInTheDocument();
  });
  it('renders only subscribed and authorized issue/document actions', async () => {
    access.permissions = new Set([PERMISSIONS.INVOICES_VIEW]); vi.mocked(api.getBillingDocument).mockResolvedValue({ ...document, status: 'DRAFT', version: 1 });
    wrap(<Routes><Route path="/invoices/:id" element={<InvoiceDetailsPage />} /></Routes>, '/invoices/11');
    await screen.findByText('Historical customer'); expect(screen.queryByRole('button', { name: 'Issue invoice' })).not.toBeInTheDocument(); expect(api.listBillingPdfs).not.toHaveBeenCalled();
  });
  it('renders field-specific controls and preserves exact strings and false values', async () => {
    function Harness() { const [values, setValues] = useState<CustomValues>({}); return <><CustomFieldsForm fields={[...settings.config.customFields, { key: 'cf_inspected', label: 'Inspected', type: 'BOOLEAN', required: true, showOnPdf: false, width: 'HALF', options: [] }, { key: 'cf_amount', label: 'Reference number', type: 'NUMBER', required: false, showOnPdf: true, width: 'HALF', options: [] }]} values={values} onChange={setValues} /><output>{JSON.stringify(values)}</output></>; }
    wrap(<Harness />); fireEvent.change(screen.getByLabelText('Reference number'), { target: { value: '9007199254740993.000001' } });
    await userEvent.click(screen.getByLabelText('Inspected *')); await userEvent.click(screen.getByLabelText('Inspected *'));
    expect(screen.getByRole('status')).toHaveTextContent('9007199254740993.000001'); expect(screen.getByRole('status')).toHaveTextContent('"cf_inspected":false');
  });
  it('filters invoice lists and keeps query keys isolated by firm', async () => {
    wrap(<InvoicesPage />); expect(await screen.findByText('INV/2627/000001', { exact: true })).toBeInTheDocument(); fireEvent.change(screen.getByLabelText('Search customer, number or reference'), { target: { value: 'PO-1' } });
    await waitFor(() => expect(api.listBillingDocuments).toHaveBeenLastCalledWith('invoices', expect.objectContaining({ search: 'PO-1', page: 1 }), expect.any(AbortSignal)));
    expect(invoicesQueryKeys.detail(1, 'invoices', 11)).not.toEqual(invoicesQueryKeys.detail(2, 'invoices', 11));
  });
});
