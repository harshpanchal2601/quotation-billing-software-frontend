import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PERMISSIONS } from '@features/auth';
import { AccessRoute } from '@app/router/guards/AccessRoute';
import { BillingSettingsPage } from './pages/BillingSettingsPage';
import { CustomFieldsForm } from './components/CustomFieldsForm';
import { InvoiceDetailsPage } from './pages/InvoiceDetailsPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { invoicesQueryKeys } from './model/invoices.query-keys';
import * as api from './api/invoices.api';
import type { CustomValues, InvoiceDocument, SettingsResponse } from './model/invoices.types';

const access = vi.hoisted(() => ({ permissions: new Set<string>(), entitled: true }));
vi.mock('@features/auth', async (original) => ({ ...(await original<typeof import('@features/auth')>()), useHasPermission: (...values: string[]) => values.some((value) => access.permissions.has(value)), useAuth: () => ({ user: { id: 1, accountType: 'FIRM_USER', firmId: 1, permissions: [...access.permissions], mustChangePassword: false } }) }));
vi.mock('@shared/tenancy/entitlements', async (original) => ({ ...(await original<typeof import('@shared/tenancy/entitlements')>()), useEntitlements: () => ({ isPending: false, isError: false, data: { permissions: Object.fromEntries([...access.permissions].map((permission) => [permission, access.entitled])) } }) }));
vi.mock('./model/invoices.query-keys', async (original) => ({ ...(await original<typeof import('./model/invoices.query-keys')>()), useBillingFirmId: () => 1 }));
vi.mock('./api/invoices.api');
const settings: SettingsResponse = { version: 3, states: { '24': 'Gujarat', '27': 'Maharashtra' }, config: { schemaVersion: 1, registration: 'REGULAR', sellerStateCode: '24', einvoiceRequired: false, prefixes: { INVOICE: 'INV', PROFORMA: 'PF', CREDIT_NOTE: 'CN', DEBIT_NOTE: 'DN' }, template: 'STANDARD', primaryColour: '#168A56', paymentInstructions: '', termsAndConditions: '', customFields: [{ key: 'cf_order', label: 'Purchase order', type: 'TEXT', required: true, showOnPdf: true, width: 'FULL', options: [] }] } };
const document: InvoiceDocument = {
  id: 11, firmId: 1, kind: 'INVOICE', status: 'ISSUED', version: 2, documentNumber: 'INV/2627/000001', companyId: 1, invoiceDate: '2026-10-27', dueDate: null, currency: 'INR', customerReference: null, paymentTerms: null, notes: null,
  buyerSnapshot: { name: 'Historical customer', legalName: null, gstin: null, billingAddress: { addressLine1: 'Address', city: 'Ahmedabad', state: 'Gujarat', postalCode: '380001', country: 'India' }, shippingAddress: null }, sellerSnapshot: { legalName: 'Historical supplier', gstin: 'fixture', stateName: 'Gujarat' }, bankSnapshot: null,
  financialPolicySnapshot: { taxMode: 'CGST_SGST', localTaxLabel: 'SGST', registration: 'REGULAR', sellerStateCode: '24' }, supplySnapshot: { isExempt: false, placeOfSupplyStateCode: '24', placeOfSupplyBasis: 'GOODS_MOVEMENT', explanation: '' }, customFieldSchema: settings.config.customFields, customFieldValues: { cf_order: 'PO-ISSUED' }, presentationSnapshot: settings.config,
  sourceSnapshot: null, sourceQuotationId: null, sourceProformaId: null, sourceInvoiceId: null, adjustmentReason: null, subtotal: '100.00', discountAmount: '0.00', taxableAmount: '100.00', taxAmount: '18.00', roundOffAmount: '0.00', grandTotal: '118.00', lines: [], statusHistory: [], postingEffect: 'DEBIT', issuedAt: '2026-10-27T00:00:00Z', voidedAt: null, voidReason: null,
};
function wrap(ui: React.ReactNode, route = '/') { const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } }); return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter></QueryClientProvider>); }
beforeEach(() => {
  vi.clearAllMocks(); access.permissions = new Set(Object.values(PERMISSIONS)); access.entitled = true;
  vi.mocked(api.getBillingSettings).mockResolvedValue(structuredClone(settings));
  vi.mocked(api.getBillingDocument).mockResolvedValue(structuredClone(document));
  vi.mocked(api.listBillingPdfs).mockResolvedValue([]);
  vi.mocked(api.listBillingDocuments).mockResolvedValue({ documents: [structuredClone(document)], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } });
});
describe('billing customization and access', () => {
  it('lets delegated field designers edit fields while hiding fiscal controls', async () => {
    access.permissions = new Set([PERMISSIONS.INVOICE_FIELDS_MANAGE, PERMISSIONS.INVOICES_VIEW]);
    wrap(<BillingSettingsPage />);
    expect(await screen.findByRole('button', { name: 'Add custom field' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Registration type')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Manage roles' })).not.toBeInTheDocument();
    const input = screen.getByLabelText('Field label', { exact: false });
    fireEvent.change(input, { target: { value: 'Client purchase order' } });
    vi.mocked(api.saveInvoiceFields).mockResolvedValue(settings);
    await userEvent.click(screen.getByRole('button', { name: 'Save custom fields' }));
    await waitFor(() => expect(api.saveInvoiceFields).toHaveBeenCalledWith(3, [expect.objectContaining({ key: 'cf_order', label: 'Client purchase order' })]));
    expect(api.saveBillingSettings).not.toHaveBeenCalled();
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
    wrap(<BillingSettingsPage />); const input = await screen.findByLabelText('Field label', { exact: false }); fireEvent.change(input, { target: { value: 'Changed locally' } });
    await userEvent.click(screen.getByRole('button', { name: 'Save custom fields' }));
    expect(await screen.findByText('Billing configuration changed; reload before saving')).toBeInTheDocument(); expect(api.saveInvoiceFields).toHaveBeenCalledTimes(1);
  });
  it('keeps issued values read-only and hides draft actions', async () => {
    wrap(<Routes><Route path="/invoices/:id" element={<InvoiceDetailsPage />} /></Routes>, '/invoices/11');
    expect(await screen.findByDisplayValue('PO-ISSUED')).toBeDisabled(); expect(screen.queryByRole('button', { name: 'Edit draft' })).not.toBeInTheDocument(); expect(screen.queryByRole('button', { name: 'Save additional values' })).not.toBeInTheDocument();
  });
  it('renders only subscribed and authorized issue/document actions', async () => {
    access.permissions = new Set([PERMISSIONS.INVOICES_VIEW]); vi.mocked(api.getBillingDocument).mockResolvedValue({ ...document, status: 'DRAFT', version: 1 });
    wrap(<Routes><Route path="/invoices/:id" element={<InvoiceDetailsPage />} /></Routes>, '/invoices/11');
    await screen.findByText('Historical customer · GSTIN Unregistered'); expect(screen.queryByRole('button', { name: 'Issue document' })).not.toBeInTheDocument(); expect(api.listBillingPdfs).not.toHaveBeenCalled();
  });
  it('renders field-specific controls and preserves exact strings and false values', async () => {
    function Harness() { const [values, setValues] = useState<CustomValues>({}); return <><CustomFieldsForm fields={[...settings.config.customFields, { key: 'cf_inspected', label: 'Inspected', type: 'BOOLEAN', required: true, showOnPdf: false, width: 'HALF', options: [] }, { key: 'cf_amount', label: 'Reference number', type: 'NUMBER', required: false, showOnPdf: true, width: 'HALF', options: [] }]} values={values} onChange={setValues} /><output>{JSON.stringify(values)}</output></>; }
    wrap(<Harness />); fireEvent.change(screen.getByLabelText('Reference number'), { target: { value: '9007199254740993.000001' } });
    await userEvent.click(screen.getByLabelText('Inspected *')); await userEvent.click(screen.getByLabelText('Inspected *'));
    expect(screen.getByRole('status')).toHaveTextContent('9007199254740993.000001'); expect(screen.getByRole('status')).toHaveTextContent('"cf_inspected":false');
  });
  it('filters invoice lists and keeps query keys isolated by firm', async () => {
    wrap(<InvoicesPage />); expect(await screen.findByText(/INV\/2627\/000001/)).toBeInTheDocument(); fireEvent.change(screen.getByLabelText('Search customer, number or reference'), { target: { value: 'PO-1' } });
    await waitFor(() => expect(api.listBillingDocuments).toHaveBeenLastCalledWith('invoices', expect.objectContaining({ search: 'PO-1', page: 1 }), expect.any(AbortSignal)));
    expect(invoicesQueryKeys.detail(1, 'invoices', 11)).not.toEqual(invoicesQueryKeys.detail(2, 'invoices', 11));
  });
});
