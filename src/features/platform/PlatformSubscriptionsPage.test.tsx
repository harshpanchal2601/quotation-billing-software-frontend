import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { theme } from '@app/theme/theme';
import type { PlatformFirm } from './platform.types';
import type { SubscriptionDetails } from './subscriptions.types';
import { PlatformSubscriptionsPage } from './PlatformSubscriptionsPage';

const state = vi.hoisted(() => ({ get: vi.fn(), api: { options: vi.fn(), firm: vi.fn(), plans: vi.fn(), plan: vi.fn(), assign: vi.fn() } }));
vi.mock('@shared/api/apiClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@shared/api/apiClient')>()), apiClient: { get: state.get },
}));
vi.mock('./subscriptions.api', () => ({ subscriptionsApi: state.api }));

const firms: PlatformFirm[] = [7, 8].map((id): PlatformFirm => ({
  id, name: id === 7 ? 'Alpha firm' : 'Beta firm', displayName: id === 7 ? 'Alpha firm' : 'Beta firm',
  slug: `firm-${id}`, status: 'ACTIVE', userLimit: 10, userCount: 2, primaryEmail: null,
  administratorEmail: `admin${id}@example.test`, createdAt: '2020-01-01T00:00:00Z', updatedAt: '2020-01-01T00:00:00Z',
}));

function details(firmId: number): SubscriptionDetails {
  const subscription = {
    id: firmId + 30, planVersionId: 22, planName: 'Business', revision: 3, status: 'SUSPENDED',
    effectiveFrom: '2020-01-01T00:00:00.000Z', effectiveUntil: '2099-12-31T12:30:00.000Z',
    trialEndsAt: null, graceEndsAt: null, currentPeriodEndsAt: '2099-12-31T12:30:00.000Z', renewalAt: null,
  };
  return {
    access: { firmId, legacy: false, evaluatedAt: '2026-11-09T00:00:00Z', permissions: {}, features: [], quotas: [], subscription },
    subscriptions: [{ ...subscription, reason: 'Reviewed business subscription', authorId: 1, planVersion: { revision: 3, plan: { name: 'Business' } } }],
    overrides: [], charges: [], paymentMode: 'MANUAL',
    pagination: { subscriptions: { page: 1, totalPages: 1 }, overrides: { page: 1, totalPages: 1 }, charges: { page: 1, totalPages: 1 } },
  };
}

function view() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><ThemeProvider theme={theme}><MemoryRouter initialEntries={['/platform/subscriptions?firmId=7']}><PlatformSubscriptionsPage /></MemoryRouter></ThemeProvider></QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  state.get.mockResolvedValue({ data: { data: { firms, pagination: { total: 2, totalPages: 1 } } } });
  state.api.firm.mockImplementation(async (firmId: number) => details(firmId));
  state.api.plans.mockResolvedValue({ plans: [], total: 0 });
  state.api.assign.mockResolvedValue({});
  state.api.options.mockResolvedValue({
    currencies: [{ value: 'INR', label: 'INR — Indian Rupee' }],
    policy: { billingCycle: [], cancellationAccess: [], downgradeTiming: [], retention: [], overridePrecedence: [] },
    subscriptionStatuses: [{ value: 'ACTIVE', label: 'Active' }, { value: 'SUSPENDED', label: 'Suspended' }],
    overrideEffects: [], paymentKinds: [],
  });
});

describe('platform subscription management', () => {
  it('loads current settings for review and preserves revision, lifecycle and dates in an explicit assignment', async () => {
    view();
    fireEvent.click(await screen.findByRole('tab', { name: 'Plan assignment' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Load current settings' }));
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Subscription state' })).toHaveTextContent('Suspended'));
    expect(screen.getByRole('combobox', { name: 'Published revision' })).toHaveTextContent('Keep current: Business · Revision 3');
    expect(screen.getByRole('button', { name: 'Apply plan assignment' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Apply plan assignment' })).toHaveAccessibleDescription(/change reason of at least 10 characters/);
    expect(state.api.assign).not.toHaveBeenCalled();
    const history = screen.getByRole('table', { name: 'Subscription history' });
    expect(within(history).getByText('Business')).toBeInTheDocument();
    expect(within(history).getByText(/Revision 3/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Reason for plan assignment/), { target: { value: 'Approved reviewed lifecycle update' } });
    expect(screen.getByLabelText(/Reason for firm change/)).toHaveValue('Approved reviewed lifecycle update');
    fireEvent.click(screen.getByRole('button', { name: 'Apply plan assignment' }));
    await waitFor(() => expect(state.api.assign).toHaveBeenCalledWith(7, expect.objectContaining({
      planVersionId: 22, expectedSubscriptionId: 37, status: 'SUSPENDED', effectiveUntil: '2099-12-31T12:30:00.000Z',
      currentPeriodEndsAt: '2099-12-31T12:30:00.000Z', trialEndsAt: null, graceEndsAt: null, renewalAt: null,
      reason: 'Approved reviewed lifecycle update',
    })));
  });
  it('clears the previous firm editor and audit reason when selecting another firm', async () => {
    view();
    fireEvent.click(await screen.findByRole('tab', { name: 'Plan assignment' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Load current settings' }));
    fireEvent.change(screen.getByLabelText(/Reason for firm change/), { target: { value: 'Reason belongs to Alpha only' } });
    const firmTable = await screen.findByRole('table', { name: 'Subscription firms' });
    const beta = within(firmTable).getByRole('row', { name: /Beta firm/ });
    fireEvent.click(within(beta).getByRole('button', { name: 'Manage subscription' }));
    await waitFor(() => expect(state.api.firm).toHaveBeenCalledWith(8, expect.any(Object), expect.any(AbortSignal)));
    expect(screen.getByLabelText(/Reason for firm change/)).toHaveValue('');
    expect(screen.getByRole('tab', { name: 'Access & usage' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('button', { name: 'Apply plan assignment' })).not.toBeInTheDocument();
    expect(state.api.assign).not.toHaveBeenCalled();
  });
});
