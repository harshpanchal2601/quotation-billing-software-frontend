import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LeadConversion } from './LeadConversion';
import { CustomerTimeline } from './CustomerTimeline';
import { crmKeys } from './crm.api';
import * as api from './crm.api';

const access = vi.hoisted(() => ({ allowed: true }));
vi.mock('@features/auth', async (original) => ({ ...(await original<typeof import('@features/auth')>()), useHasPermission: () => access.allowed }));
vi.mock('@shared/tenancy/useFirmId', () => ({ useFirmId: () => 1 }));
vi.mock('./crm.api', async (original) => ({ ...(await original<typeof import('./crm.api')>()), crmOptions: vi.fn(), leadSuggestions: vi.fn(), convertLead: vi.fn(), customerTimeline: vi.fn(), recordActivity: vi.fn() }));
function wrap(element: React.ReactNode) { return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } })}><MemoryRouter>{element}</MemoryRouter></QueryClientProvider>); }
beforeEach(() => { vi.clearAllMocks(); access.allowed = true; vi.mocked(api.crmOptions).mockResolvedValue({ owners: [{ id: 1, name: 'Owner' }], companies: [{ id: 7, name: 'Existing company' }], stages: { NEW: 10 } }); vi.mocked(api.leadSuggestions).mockResolvedValue([{ id: 7, name: 'Existing company', companyCode: 'COMP-0007' }]); vi.mocked(api.customerTimeline).mockResolvedValue({ records: [], pagination: { totalPages: 0 } }); });
describe('CRM master identity and visibility', () => {
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
