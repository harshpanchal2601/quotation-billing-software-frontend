import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConnectionsPage } from './ConnectionsPage';
import * as api from './connections.api';
const access = vi.hoisted(() => ({ firmId: 1, actorId: 10, permissions: new Set<string>() }));
vi.mock('@shared/tenancy/useFirmId', () => ({ useFirmId: () => access.firmId }));
vi.mock('@features/auth', async (original) => ({ ...(await original<typeof import('@features/auth')>()), useAuth: () => ({ user: { id: access.actorId } }), useHasPermission: (...permissions: string[]) => permissions.some((permission) => access.permissions.has(permission)) }));
vi.mock('./connections.api', async (original) => ({ ...(await original<typeof import('./connections.api')>()), listKeys: vi.fn(), listEndpoints: vi.fn(), listProviderStatus: vi.fn(), listDeliveries: vi.fn(), issueKey: vi.fn(), revokeKey: vi.fn(), createEndpoint: vi.fn(), rotateEndpoint: vi.fn(), toggleEndpoint: vi.fn() }));
beforeEach(() => {
  vi.resetAllMocks(); access.firmId = 1; access.actorId = 10; access.permissions = new Set(['api-keys.manage']);
  vi.mocked(api.listKeys).mockResolvedValue({ keys: [], pagination: { totalPages: 0 } });
  vi.mocked(api.listEndpoints).mockResolvedValue({ endpoints: [], configuration: { encryptionConfigured: false, destinationsConfigured: false, workerEnabled: false, eventTypes: ['report.exported.v1'] } });
});
afterEach(cleanup);
const tree = (cache: QueryClient) => <QueryClientProvider client={cache}><ConnectionsPage /></QueryClientProvider>;
const client = () => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
describe('scoped integration configuration', () => {
  it('shows a new token once without retaining it as mutation-cache data', async () => {
    const cache = client(); const token = 'fixture-token-shown-once';
    vi.mocked(api.issueKey).mockResolvedValue({ key: { id: 'key-1', name: 'Reporting consumer', scopes: ['reports.read'], expiresAt: '2026-12-01', revokedAt: null }, token });
    render(tree(cache)); fireEvent.change(screen.getByRole('textbox', { name: /API key name/ }), { target: { value: 'Reporting consumer' } });
    await userEvent.click(screen.getByRole('button', { name: 'Create API key' }));
    expect(await screen.findByLabelText('New API token shown once')).toHaveValue(token);
    await waitFor(() => expect(api.issueKey).toHaveBeenCalledWith({ name: 'Reporting consumer', lifetimeDays: 30, scopes: ['reports.read'] }, undefined));
    expect(JSON.stringify(cache.getMutationCache().getAll().map((mutation) => mutation.state.data))).not.toContain(token);
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss token' })); expect(screen.queryByDisplayValue(token)).not.toBeInTheDocument();
  });
  it('explains missing webhook configuration and does not enable setup', async () => {
    access.permissions = new Set(['webhooks.manage']); render(tree(client()));
    expect(await screen.findByText(/Encryption missing/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create disabled endpoint' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Create API key' })).not.toBeInTheDocument();
  });
  it('removes an old firm token from the visible form after a context change', async () => {
    const cache = client(); vi.mocked(api.issueKey).mockResolvedValue({ key: { id: 'key-1', name: 'Old firm', scopes: ['reports.read'], expiresAt: '', revokedAt: null }, token: 'old-firm-token' });
    const view = render(tree(cache)); fireEvent.change(screen.getByRole('textbox', { name: /API key name/ }), { target: { value: 'Old firm' } });
    await userEvent.click(screen.getByRole('button', { name: 'Create API key' })); await screen.findByDisplayValue('old-firm-token');
    access.firmId = 2; access.actorId = 20; view.rerender(tree(cache));
    expect(screen.queryByDisplayValue('old-firm-token')).not.toBeInTheDocument();
  });
});
