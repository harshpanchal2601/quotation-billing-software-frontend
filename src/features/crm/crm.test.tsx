import { NotificationProvider } from '@shared/ui/feedback';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LeadConversion } from './LeadConversion';
import { CrmRecordForm } from './CrmRecordForm';
import { CustomerTimeline } from './CustomerTimeline';
import { CrmPage } from './CrmPage';
import { crmKeys } from './crm.api';
import * as api from './crm.api';

const access = vi.hoisted(() => ({ allowed: true }));
vi.mock('@features/auth', async (original) => ({ ...(await original<typeof import('@features/auth')>()), useHasPermission: () => access.allowed }));
vi.mock('@shared/tenancy/useFirmId', () => ({ useFirmId: () => 1 }));
vi.mock('./crm.api', async (original) => ({ ...(await original<typeof import('./crm.api')>()), listCrm: vi.fn(), crmOptions: vi.fn(), leadSuggestions: vi.fn(), convertLead: vi.fn(), customerTimeline: vi.fn(), recordActivity: vi.fn(), saveCrm: vi.fn() }));
function wrap(element: React.ReactNode, entry = '/') { return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } })}><NotificationProvider><MemoryRouter initialEntries={[entry]}>{element}</MemoryRouter></NotificationProvider></QueryClientProvider>); }
beforeEach(() => { vi.clearAllMocks(); access.allowed = true; vi.mocked(api.crmOptions).mockResolvedValue({ owners: [{ id: 1, name: 'Owner' }], companies: [{ id: 7, name: 'Existing company' }], stages: { NEW: 10 } }); vi.mocked(api.leadSuggestions).mockResolvedValue([{ id: 7, name: 'Existing company', companyCode: 'COMP-0007' }]); vi.mocked(api.customerTimeline).mockResolvedValue({ records: [], pagination: { totalPages: 0 } }); });
describe('CRM master identity and visibility', () => {
  it('shows readable timeline changes without changes between two missing values', async () => {
    vi.mocked(api.customerTimeline).mockResolvedValue({ records: [{ id: 1, kind: 'HISTORY', subject: 'Lead captured', notes: null, createdAt: '2026-11-12T00:00:00Z', createdBy: { name: 'Reviewer' }, details: { before: null, after: { ownerId: 6, companyId: null, status: 'NEW' } } }], pagination: { totalPages: 1 } });
    wrap(<CustomerTimeline leadId={1} />);
    expect(await screen.findByText('Owner: — → User #6')).toBeInTheDocument();
    expect(screen.getByText('Status: — → New')).toBeInTheDocument();
    expect(screen.queryByText('Company: — → —')).not.toBeInTheDocument();
  });
  it.each([
    ['leads', 'Leads', ['Lead', 'Email', 'Phone', 'Owner', 'Source']],
    ['opportunities', 'Opportunities', ['Opportunity', 'Stage', 'Currency', 'Value', 'Probability', 'Expected close']],
    ['tasks', 'Follow-ups', ['Follow-up', 'Assigned to', 'Due at (local time)', 'Reminder (local time)', 'Notes']],
  ])('keeps an empty %s tab in a table with its own columns', async (tab, label, headings) => {
    vi.mocked(api.listCrm).mockResolvedValue({ records: [], pagination: { total: 0, totalPages: 0 } });
    wrap(<CrmPage />, `/?tab=${tab}&search=customer&companyId=7`);
    expect(await screen.findByRole('table', { name: label })).toBeInTheDocument();
    headings.forEach((heading) => expect(screen.getByRole('columnheader', { name: heading })).toBeInTheDocument());
    expect(api.listCrm).toHaveBeenCalledWith(tab, expect.objectContaining({ search: 'customer', companyId: 7, page: 1 }), expect.any(AbortSignal));
  });
  it('shows linked names and exact opportunity values once, without a duplicate pipeline', async () => {
    vi.mocked(api.listCrm).mockResolvedValue({ records: [{ id: 8, version: 1, title: 'Customer expansion', companyId: 7, company: { id: 7, name: 'Existing company' }, ownerId: 1, owner: { id: 1, name: 'Owner' }, stage: 'NEGOTIATION', currency: 'INR', value: '9007199254740993.003', probability: 75, expectedClose: '2026-11-30T00:00:00.000Z' }], pagination: { total: 1, totalPages: 1 } });
    wrap(<CrmPage />, '/?tab=opportunities');
    expect(await screen.findByRole('cell', { name: 'Customer expansion' })).toBeInTheDocument();
    expect(screen.getAllByText('Customer expansion')).toHaveLength(1);
    expect(screen.getByRole('cell', { name: '9007199254740993.003' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Owner' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Existing company' })).toHaveAttribute('href', '/companies/7');
    expect(screen.getByRole('cell', { name: '2026-11-30' })).toBeInTheDocument();
  });
  it('saves an explicit owner and closes entry with persistent feedback', async () => {
    const onSaved = vi.fn(); vi.mocked(api.saveCrm).mockResolvedValue({ id: 11, version: 1, name: 'QA prospect' });
    wrap(<CrmRecordForm kind="leads" record={null} onSaved={onSaved} />);
    await userEvent.type(screen.getByRole('textbox', { name: 'Prospect name' }), 'QA prospect');
    await userEvent.click(screen.getByRole('combobox', { name: 'Owner' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Owner' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save lead' }));
    await waitFor(() => expect(api.saveCrm).toHaveBeenCalledWith('leads', { name: 'QA prospect', email: null, phone: null, source: null, ownerId: 1 }, undefined));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('status')).toHaveTextContent('Lead saved.');
    expect(onSaved).toHaveBeenCalledTimes(1);
  });
  it('suggests duplicates without converting and requires deliberate new-company confirmation', async () => {
    vi.mocked(api.convertLead).mockResolvedValue({ id: 10, version: 2, companyId: 8 });
    wrap(<LeadConversion lead={{ id: 10, version: 1, name: 'Buyer company', email: 'buyer@example.invalid' }} onSaved={vi.fn()} />);
    await screen.findByText(/Suggested matches: Existing company/); expect(api.convertLead).not.toHaveBeenCalled();
    await userEvent.click(screen.getByLabelText('Explicitly create a new company'));
    expect(screen.getByRole('button', { name: 'Convert lead' })).toBeDisabled();
    await userEvent.click(screen.getByLabelText('I reviewed matches and confirm this is a new company'));
    await userEvent.click(screen.getByRole('button', { name: 'Convert lead' }));
    await waitFor(() => expect(api.convertLead).toHaveBeenCalledWith(10, expect.objectContaining({ expectedVersion: 1, confirmNewCompany: true, idempotencyKey: expect.any(String), newCompany: expect.objectContaining({ name: 'Buyer company' }) })));
  });
  it('does not fetch customer activity without CRM permission and partitions caches by firm', () => {
    access.allowed = false; wrap(<CustomerTimeline companyId={7} />); expect(api.customerTimeline).not.toHaveBeenCalled(); expect(crmKeys.firm(1)).not.toEqual(crmKeys.firm(2));
  });
});
