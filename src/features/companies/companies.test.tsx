import { QueryClient } from '@tanstack/react-query';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@shared/test/render';
import { CompaniesPage } from './pages/CompaniesPage';
import { CreateCompanyPage } from './pages/CreateCompanyPage';
import { EditCompanyPage } from './pages/EditCompanyPage';
import { CompanyDetailsPage } from './pages/CompanyDetailsPage';
import type { CompanyDetail, CompanyListItem, CompanyQuotation } from './model/companies.types';

const companiesApi = vi.hoisted(() => ({
  listCompaniesRequest: vi.fn(),
  createCompanyRequest: vi.fn(),
  getCompanyRequest: vi.fn(),
  updateCompanyRequest: vi.fn(),
  updateCompanyStatusRequest: vi.fn(),
  deleteCompanyRequest: vi.fn(),
  listCompanyQuotationsRequest: vi.fn(),
}));

const contactsApi = vi.hoisted(() => ({
  createCompanyContactRequest: vi.fn(),
  updateCompanyContactRequest: vi.fn(),
  deleteCompanyContactRequest: vi.fn(),
  setPrimaryCompanyContactRequest: vi.fn(),
}));

const addressesApi = vi.hoisted(() => ({
  createCompanyAddressRequest: vi.fn(),
  updateCompanyAddressRequest: vi.fn(),
  deleteCompanyAddressRequest: vi.fn(),
  setPrimaryCompanyAddressRequest: vi.fn(),
}));

vi.mock('./api/companies.api', () => companiesApi);
vi.mock('./api/contacts.api', () => contactsApi);
vi.mock('./api/addresses.api', () => addressesApi);

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('company frontend', () => {
  it('renders company list data and sends URL filters to the API', async () => {
    companiesApi.listCompaniesRequest.mockResolvedValue({
      companies: [companyListItem()],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    });

    renderCompany(<CompaniesPage />, '/companies?search=acme&isActive=true&sort=name:asc');

    expect(await screen.findAllByText('Acme Pharma')).not.toHaveLength(0);
    expect(companiesApi.listCompaniesRequest).toHaveBeenCalledWith(expect.objectContaining({
      search: 'acme',
      isActive: true,
      sortBy: 'name',
      sortOrder: 'asc',
    }));
  });

  it('creates companies with nested primary contact and address data without company code', async () => {
    companiesApi.createCompanyRequest.mockResolvedValue(companyDetail());
    renderCompany(<CreateCompanyPage />, '/companies/new');

    await userEvent.type(screen.getByLabelText(/company name/i), 'Acme Pharma');
    await userEvent.type(screen.getByLabelText(/^contact name/i), 'Nitish');
    await userEvent.type(screen.getByLabelText(/^phone/i), '+91 0987654321');
    await userEvent.type(screen.getByLabelText(/^address line 1/i), 'Factory Road');
    await userEvent.click(screen.getByRole('button', { name: /create company/i }));

    await waitFor(() => expect(companiesApi.createCompanyRequest).toHaveBeenCalled());
    const payload = companiesApi.createCompanyRequest.mock.calls[0][0];
    expect(payload).toEqual(expect.objectContaining({
      name: 'Acme Pharma',
      contacts: [expect.objectContaining({ name: 'Nitish', phone: '+91 0987654321', isPrimary: true })],
      addresses: [expect.objectContaining({ addressType: 'BILLING', addressLine1: 'Factory Road', isPrimary: true })],
    }));
    expect(payload).not.toHaveProperty('companyCode');
  });

  it('updates only company fields and keeps contacts and addresses out of the update payload', async () => {
    companiesApi.getCompanyRequest.mockResolvedValue(companyDetail());
    companiesApi.updateCompanyRequest.mockResolvedValue(companyDetail({ name: 'Acme Pharma Updated' }));
    renderCompanyRoute(<EditCompanyPage />, '/companies/:id/edit', '/companies/1/edit');

    await screen.findByText('COMP-000001');
    await userEvent.clear(screen.getByLabelText(/company name/i));
    await userEvent.type(screen.getByLabelText(/company name/i), 'Acme Pharma Updated');
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(companiesApi.updateCompanyRequest).toHaveBeenCalled());
    const payload = companiesApi.updateCompanyRequest.mock.calls[0][1];
    expect(payload).toEqual(expect.objectContaining({ name: 'Acme Pharma Updated' }));
    expect(payload).not.toHaveProperty('contacts');
    expect(payload).not.toHaveProperty('addresses');
    expect(payload).not.toHaveProperty('companyCode');
  });

  it('sets primary contacts and addresses through dedicated endpoints', async () => {
    companiesApi.getCompanyRequest.mockResolvedValue(companyDetail());
    contactsApi.setPrimaryCompanyContactRequest.mockResolvedValue(companyDetail().contacts[1]);
    addressesApi.setPrimaryCompanyAddressRequest.mockResolvedValue(companyDetail().addresses[1]);

    renderCompanyRoute(<CompanyDetailsPage />, '/companies/:id', '/companies/1?tab=contacts');

    await userEvent.click(await screen.findByRole('button', { name: /set primary/i }));
    await waitFor(() => expect(contactsApi.setPrimaryCompanyContactRequest).toHaveBeenCalledWith(1, 2));

    cleanup();
    renderCompanyRoute(<CompanyDetailsPage />, '/companies/:id', '/companies/1?tab=addresses');
    await userEvent.click(await screen.findByRole('button', { name: /set primary/i }));
    await waitFor(() => expect(addressesApi.setPrimaryCompanyAddressRequest).toHaveBeenCalledWith(1, 2));
  });

  it('shows Back to Companies on detail pages with a direct-route fallback', async () => {
    companiesApi.getCompanyRequest.mockResolvedValue(companyDetail());

    renderCompanyRoute(<CompanyDetailsPage />, '/companies/:id', '/companies/1');

    expect(await screen.findByRole('heading', { level: 1, name: 'Acme Pharma' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to companies/i })).toHaveAttribute('href', '/companies');
  });

  it('opens detail pages with the current company list URL in navigation state', async () => {
    companiesApi.listCompaniesRequest.mockResolvedValue({
      companies: [companyListItem()],
      pagination: { page: 2, limit: 10, total: 12, totalPages: 2, hasNextPage: false, hasPreviousPage: true },
    });

    renderCompany(
      <Routes>
        <Route path="/companies" element={<CompaniesPage />} />
        <Route path="/companies/:id" element={<CompanyReturnStateProbe />} />
      </Routes>,
      '/companies?search=acme&isActive=true&page=2&limit=10&sort=name:asc',
    );

    await userEvent.click((await screen.findAllByRole('link', { name: /^view$/i }))[0]);

    expect(await screen.findByText('/companies?search=acme&isActive=true&page=2&limit=10&sort=name:asc')).toBeInTheDocument();
  });

  it('displays backend deletion conflicts safely', async () => {
    companiesApi.listCompaniesRequest.mockResolvedValue({
      companies: [companyListItem()],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    });
    companiesApi.deleteCompanyRequest.mockRejectedValue({
      isAxiosError: true,
      response: { status: 409, data: { success: false, message: 'Company cannot be deleted because quotations are linked to it.' } },
    });

    renderCompany(<CompaniesPage />, '/companies');
    expect(await screen.findAllByText('Acme Pharma')).not.toHaveLength(0);
    await userEvent.click(screen.getAllByRole('button', { name: /delete/i })[0]);
    await userEvent.click(screen.getByRole('button', { name: /delete company/i }));

    expect(await screen.findByText('Company cannot be deleted because quotations are linked to it.')).toBeInTheDocument();
  });

  it('shows row-specific loading while a company status change is pending', async () => {
    const pendingStatus = deferred<CompanyListItem>();
    companiesApi.listCompaniesRequest.mockResolvedValue({
      companies: [companyListItem(), companyListItem({ id: 2, companyCode: 'COMP-000002', name: 'Beta Pharma' })],
      pagination: { page: 1, limit: 20, total: 2, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    });
    companiesApi.updateCompanyStatusRequest.mockReturnValue(pendingStatus.promise);

    renderCompany(<CompaniesPage />, '/companies');

    expect(await screen.findAllByText('Acme Pharma')).not.toHaveLength(0);
    const deactivateButtons = screen.getAllByRole('button', { name: /^deactivate$/i });
    await userEvent.click(deactivateButtons[0]!);
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^deactivate$/i }));

    expect(deactivateButtons[0]).toBeDisabled();
    expect(deactivateButtons[1]).not.toBeDisabled();
  });

  it('shows paginated quotation history amounts with returned currency', async () => {
    companiesApi.getCompanyRequest.mockResolvedValue(companyDetail());
    companiesApi.listCompanyQuotationsRequest.mockResolvedValue({
      quotations: [quotation()],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    });

    renderCompanyRoute(<CompanyDetailsPage />, '/companies/:id', '/companies/1?tab=quotations');

    expect(await screen.findByText('Q-001')).toBeInTheDocument();
    expect(screen.getByText(/₹10,000.00/)).toBeInTheDocument();
  });

  it('renders company quotation history as compact cards on mobile and tablet widths', async () => {
    mockViewport(700);
    companiesApi.getCompanyRequest.mockResolvedValue(companyDetail());
    companiesApi.listCompanyQuotationsRequest.mockResolvedValue({
      quotations: [quotation()],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    });

    renderCompanyRoute(<CompanyDetailsPage />, '/companies/:id', '/companies/1?tab=quotations');

    expect(await screen.findByLabelText('Company quotation history cards')).toBeInTheDocument();
    expect(screen.getByText('Q-001')).toBeInTheDocument();
    expect(screen.getByText('Quotation date')).toBeInTheDocument();
    expect(screen.getByText('Valid until')).toBeInTheDocument();
    expect(screen.getByText(/₹10,000.00/)).toBeInTheDocument();
  });
});

function renderCompany(ui: ReactElement, route: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return renderWithProviders(ui, { route, queryClient });
}

function renderCompanyRoute(ui: ReactElement, path: string, route: string) {
  return renderCompany(<Routes><Route path={path} element={ui} /></Routes>, route);
}

function CompanyReturnStateProbe() {
  const location = useLocation();
  const state = location.state as { from?: string } | null;
  return <div>{state?.from ?? 'missing return state'}</div>;
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

function companyListItem(overrides: Partial<CompanyListItem> = {}): CompanyListItem {
  return {
    id: 1,
    companyCode: 'COMP-000001',
    name: 'Acme Pharma',
    legalName: 'Acme Pharma Private Limited',
    gstin: '24AAMCB7736K1Z9',
    pan: null,
    website: null,
    isActive: true,
    primaryContact: { id: 1, name: 'Nitish', designation: null, email: 'nitish@example.com', phone: '+91 9876543210', alternatePhone: null, isPrimary: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    primaryBillingAddress: { id: 1, addressType: 'BILLING', addressLine1: 'Factory Road', addressLine2: null, city: 'Ahmedabad', state: 'Gujarat', postalCode: '038001', country: 'India', isPrimary: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    primaryShippingAddress: null,
    quotationCount: 2,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    ...overrides,
  };
}

function companyDetail(overrides: Partial<CompanyDetail> = {}): CompanyDetail {
  return {
    ...companyListItem(),
    notes: 'Important customer',
    contacts: [
      companyListItem().primaryContact!,
      { id: 2, name: 'Asha', designation: null, email: null, phone: '0987654321', alternatePhone: null, isPrimary: false, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    ],
    addresses: [
      companyListItem().primaryBillingAddress!,
      { id: 2, addressType: 'BILLING', addressLine1: 'Old Road', addressLine2: null, city: '', state: '', postalCode: '00123', country: 'India', isPrimary: false, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    ],
    quotationSummary: { total: 1, draft: 1, pending: 0, completed: 0 },
    ...overrides,
  };
}

function quotation(): CompanyQuotation {
  return {
    id: 1,
    quotationNumber: 'Q-001',
    revisionNumber: 0,
    quotationDate: '2026-01-01T00:00:00.000Z',
    validUntil: '2026-02-01T00:00:00.000Z',
    status: 'DRAFT',
    currency: 'INR',
    grandTotal: '10000.00',
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
