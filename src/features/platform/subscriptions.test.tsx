import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { theme } from '@app/theme/theme';
import { AccessRoute } from '@app/router/guards/AccessRoute';
import { canAccessNavigationItem, navigationItems, paths } from '@app/router/routeConfig';
import { setSelectedFirm } from '@shared/tenancy/selectedFirm';
import type { EffectiveAccess } from '@shared/tenancy/entitlements';
import { PlatformPlansPage } from './PlatformPlansPage';
import type { PlanDetail, PlanVersion } from './subscriptions.types';

const state = vi.hoisted(() => ({
  permissions: ['dashboard.view'] as string[], pending: false, error: false,
  access: undefined as EffectiveAccess | undefined,
  api: { options: vi.fn(), plans: vi.fn(), features: vi.fn(), plan: vi.fn(), audit: vi.fn(), saveVersion: vi.fn(), preview: vi.fn(), publish: vi.fn(), createPlan: vi.fn(), updatePlan: vi.fn(), switchFeature: vi.fn() },
}));
vi.mock('@features/auth', async (importOriginal) => ({ ...(await importOriginal<typeof import('@features/auth')>()), useAuth: () => ({ user: { id: 1, accountType: 'FIRM_ADMIN', firmId: 1, permissions: state.permissions, mustChangePassword: false } }) }));
vi.mock('@shared/tenancy/entitlements', async (importOriginal) => ({ ...(await importOriginal<typeof import('@shared/tenancy/entitlements')>()), useEntitlements: () => ({ data: state.access, isPending: state.pending, isError: state.error, refetch: vi.fn() }) }));
vi.mock('./subscriptions.api', () => ({ subscriptionsApi: state.api }));

const policy = { trialDays: 0, graceDays: 0, billingCycle: 'MANUAL', cancellationAccess: 'IMMEDIATE', downgradeTiming: 'IMMEDIATE', retention: 'RETAIN', overridePrecedence: 'LATEST_EFFECTIVE_REPLACEMENT' } as const;
const plan: PlanDetail = { id: 1, name: 'Fixture plan', slug: 'fixture', isLegacy: false, archivedAt: null, versions: [] };
const draftVersion: PlanVersion = { id: 2, planId: 1, revision: 1, policy: null, price: null, currency: null, publishedAt: null, features: [{ featureKey: 'firm.core' }], quotas: [{ resource: 'users', limit: '4' }, { resource: 'documents', limit: null }, { resource: 'storageBytes', limit: null }, { resource: 'aiCredits', limit: '0' }] };
function access(allowed: boolean): EffectiveAccess { return { firmId: 1, legacy: false, evaluatedAt: new Date().toISOString(), features: [], quotas: [], subscription: null, permissions: { 'dashboard.view': allowed } }; }
function view(element: ReactElement, route = '/') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><ThemeProvider theme={theme}><MemoryRouter initialEntries={[route]}>{element}</MemoryRouter></ThemeProvider></QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks(); setSelectedFirm(null);
  state.permissions = ['dashboard.view']; state.pending = false; state.error = false; state.access = access(true);
  state.api.plans.mockResolvedValue({ plans: [plan], total: 1 });
  state.api.plan.mockResolvedValue(plan);
  state.api.features.mockResolvedValue({ features: [{ key: 'firm.core', description: 'Firm core', dependencies: [], required: true, switch: null }] });
  state.api.audit.mockResolvedValue({ events: [], total: 0 });
  state.api.options.mockResolvedValue({
    currencies: [{ value: 'INR', label: 'INR — Indian Rupee' }, { value: 'CHF', label: 'CHF — Swiss Franc' }],
    policy: {
      billingCycle: [{ value: 'MANUAL', label: 'Manual' }], cancellationAccess: [{ value: 'IMMEDIATE', label: 'Immediately' }],
      downgradeTiming: [{ value: 'IMMEDIATE', label: 'Immediately' }], retention: [{ value: 'RETAIN', label: 'Retain firm data' }],
      overridePrecedence: [{ value: 'LATEST_EFFECTIVE_REPLACEMENT', label: 'Latest effective override replaces earlier overrides' }],
    }, subscriptionStatuses: [], overrideEffects: [], paymentKinds: [],
  });
});

describe('entitlement route and navigation guards', () => {
  function guarded() { return <Routes><Route path="/dashboard" element={<AccessRoute permissions={['dashboard.view']}><div>Private dashboard</div></AccessRoute>} /><Route path="/access-denied" element={<div>Access denied</div>} /></Routes>; }
  it('denies a direct URL when RBAC allows but subscribed access denies', () => {
    state.access = access(false); view(guarded(), '/dashboard');
    expect(screen.getByText('Access denied')).toBeInTheDocument();
    expect(screen.queryByText('Private dashboard')).not.toBeInTheDocument();
  });
  it('holds protected content while the entitlement request is pending or fails', () => {
    state.pending = true; const rendered = view(guarded(), '/dashboard');
    expect(screen.queryByText('Private dashboard')).not.toBeInTheDocument(); rendered.unmount();
    state.pending = false; state.error = true; view(guarded(), '/dashboard');
    expect(screen.getByText('Your subscribed access could not be checked.')).toBeInTheDocument();
  });
  it('combines navigation entitlement, role and platform scope independently', () => {
    const dashboard = navigationItems.find((item) => item.path === paths.dashboard)!;
    const plans = navigationItems.find((item) => item.path === paths.platformPlans)!;
    const user = { accountType: 'FIRM_ADMIN' as const, permissions: ['dashboard.view' as const] };
    expect(canAccessNavigationItem(dashboard, user, false, access(false))).toBe(false);
    expect(canAccessNavigationItem(dashboard, { ...user, permissions: [] }, false, access(true))).toBe(false);
    expect(canAccessNavigationItem(dashboard, user, false, access(true))).toBe(true);
    expect(canAccessNavigationItem(plans, user, false, access(true))).toBe(false);
    expect(canAccessNavigationItem(plans, { accountType: 'SUPER_ADMIN', permissions: [] }, false)).toBe(true);
  });
  it('blocks a firm administrator from direct platform URLs', () => {
    view(<Routes><Route path="/platform/plans" element={<AccessRoute accountTypes={['SUPER_ADMIN']} tenantScoped={false}><div>Platform editor</div></AccessRoute>} /><Route path="/dashboard" element={<div>Firm workspace</div>} /></Routes>, '/platform/plans');
    expect(screen.getByText('Firm workspace')).toBeInTheDocument(); expect(screen.queryByText('Platform editor')).not.toBeInTheDocument();
  });
});

describe('plan publication workflow', () => {
  it('saves unapproved policy as a draft and prevents publication when preview rejects it', async () => {
    state.api.saveVersion.mockResolvedValue({ versionId: 2 });
    state.api.preview.mockResolvedValue({ version: draftVersion, errors: ['Lifecycle policy requires approval'], previewToken: 'a'.repeat(64) });
    view(<PlatformPlansPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Manage Fixture plan' }));
    fireEvent.click(await screen.findByRole('button', { name: 'New revision' }));
    fireEvent.change(screen.getByLabelText(/Reason for platform change/), { target: { value: 'Reviewed fixture change' } });
    fireEvent.change(screen.getByLabelText(/^Users/), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(state.api.saveVersion).toHaveBeenCalledWith(1, null, expect.objectContaining({ policy: null, quotas: expect.objectContaining({ users: '4' }) })));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Preview saved revision' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Preview saved revision' }));
    expect(await screen.findByText('Lifecycle policy requires approval')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish approved revision' })).toBeDisabled(); expect(state.api.publish).not.toHaveBeenCalled();
  });
  it('requires successful saved preview before publishing an approved revision', async () => {
    state.api.plan.mockResolvedValue({ ...plan, versions: [{ id: 2, planId: 1, revision: 1, policy, price: null, currency: null, publishedAt: null, features: [{ featureKey: 'firm.core' }], quotas: [{ resource: 'users', limit: '4' }] }] });
    state.api.preview.mockResolvedValue({ version: { ...draftVersion, policy }, errors: [], previewToken: 'a'.repeat(64) }); state.api.publish.mockResolvedValue({});
    view(<PlatformPlansPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Manage Fixture plan' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Edit draft 1' }));
    fireEvent.change(screen.getByLabelText(/Reason for platform change/), { target: { value: 'Approved fixture publication' } });
    expect(screen.getByRole('button', { name: 'Publish approved revision' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Preview saved revision' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Publish approved revision' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Publish approved revision' }));
    await waitFor(() => expect(state.api.publish).toHaveBeenCalledWith(1, 2, 'Approved fixture publication', 'a'.repeat(64)));
  });
  it('copies a published revision into an unsaved draft without modifying the published revision', async () => {
    const published = { ...draftVersion, policy, price: '199.00', currency: 'INR', publishedAt: '2026-11-09T00:00:00Z' };
    state.api.plan.mockResolvedValue({ ...plan, versions: [published] });
    state.api.saveVersion.mockResolvedValue({ versionId: 3 });
    view(<PlatformPlansPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Manage Fixture plan' }));
    fireEvent.click(await screen.findByRole('button', { name: 'View revision 1' }));
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Copy to new revision' }));
    expect(screen.getByLabelText(/^Users/)).toHaveValue('4');
    expect(screen.getByLabelText('Display price')).toHaveValue('199.00');
    expect(screen.getByRole('button', { name: 'Preview saved revision' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Publish approved revision' })).toBeDisabled();
    expect(state.api.saveVersion).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/Reason for platform change/), { target: { value: 'Prepare revised business offering' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(state.api.saveVersion).toHaveBeenCalledWith(1, null, expect.objectContaining({ policy, price: '199.00', currency: 'INR', quotas: expect.objectContaining({ users: '4' }) })));
    expect(state.api.publish).not.toHaveBeenCalled();
  });
  it('opens the first unsaved revision after creating a plan without publishing or saving it automatically', async () => {
    const created = { ...plan, id: 3, name: 'Business', slug: 'business' };
    state.api.createPlan.mockResolvedValue(created);
    state.api.plan.mockResolvedValue(created);
    view(<PlatformPlansPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Create plan' }));
    fireEvent.change(screen.getByLabelText(/^Plan name/), { target: { value: 'Business' } });
    fireEvent.change(screen.getByLabelText(/^Plan slug/), { target: { value: 'business' } });
    fireEvent.change(screen.getByLabelText(/Reason for creating plan/), { target: { value: 'Introduce business subscription plan' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create draft plan' }));
    expect(await screen.findByRole('heading', { name: 'New revision' })).toBeInTheDocument();
    expect(state.api.createPlan).toHaveBeenCalledWith({ name: 'Business', slug: 'business', reason: 'Introduce business subscription plan' });
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
    expect(state.api.saveVersion).not.toHaveBeenCalled();
    expect(state.api.publish).not.toHaveBeenCalled();
  });
  it('explains disabled actions and requires selecting a server-provided currency with the revision reason', async () => {
    state.api.saveVersion.mockResolvedValue({ versionId: 2 });
    view(<PlatformPlansPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Manage Fixture plan' }));
    fireEvent.click(await screen.findByRole('button', { name: 'New revision' }));
    fireEvent.change(screen.getByLabelText(/^Users/), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Display price'), { target: { value: '10' } });
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save draft' })).toHaveAccessibleDescription(/change reason of at least 10 characters/);
    expect(screen.getByRole('button', { name: 'Preview saved revision' })).toHaveAccessibleDescription('Save the draft before previewing.');
    fireEvent.change(screen.getByLabelText(/Reason for revision change/), { target: { value: 'Approved revised business pricing' } });
    expect(screen.getByLabelText(/Reason for platform change/)).toHaveValue('Approved revised business pricing');
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save draft' })).toHaveAccessibleDescription(/Select a currency for the display price/);
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Currency code' })).not.toHaveAttribute('aria-disabled', 'true'));
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Currency code' }));
    fireEvent.click(await screen.findByRole('option', { name: 'CHF — Swiss Franc' }));
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Publish approved revision' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(state.api.saveVersion).toHaveBeenCalledWith(1, null, expect.objectContaining({ price: '10', currency: 'CHF', reason: 'Approved revised business pricing' })));
    expect(state.api.publish).not.toHaveBeenCalled();
  });
});
