import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PurchasingPage } from './PurchasingPage';
import * as api from './purchasing.api';

const access = vi.hoisted(() => ({ permissions: new Set<string>() }));
vi.mock('@shared/tenancy/useFirmId', () => ({ useFirmId: () => 1 }));
vi.mock('@features/auth', async (original) => ({ ...(await original<typeof import('@features/auth')>()), useHasPermission: (...permissions: string[]) => permissions.some((permission) => access.permissions.has(permission)) }));
vi.mock('./purchasing.api', async (original) => ({ ...(await original<typeof import('./purchasing.api')>()), listPurchases: vi.fn(), getPurchase: vi.fn(), purchaseOptions: vi.fn(), purchaseCommand: vi.fn() }));
beforeEach(() => {
  vi.clearAllMocks(); access.permissions = new Set(['expenses.view', 'expenses.manage']);
  vi.mocked(api.listPurchases).mockResolvedValue({ records: [], pagination: { page: 1, limit: 20, total: 0 } });
  vi.mocked(api.purchaseOptions).mockResolvedValue({ suppliers: [], items: [], receiptLines: [], warehouses: [], financial: { version: 0, policy: { schemaVersion: 1, currency: 'KWD', rounding: 'HALF_UP', grandTotal: 'MINOR_UNIT', tax: { id: 'none', version: 1 }, inAppNotifications: false } } });
});
afterEach(cleanup);
describe('purchasing and standalone expense workflow', () => {
  it('retains exact expense amounts and retry keys without requiring inventory or sales permissions', async () => {
    vi.mocked(api.purchaseCommand).mockRejectedValue(new Error('Response lost'));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
    render(<QueryClientProvider client={client}><MemoryRouter><PurchasingPage /></MemoryRouter></QueryClientProvider>);
    await screen.findByText('Record standalone expense');
    expect(screen.queryByRole('tab', { name: 'Purchase orders' })).not.toBeInTheDocument(); expect(screen.queryByLabelText('Receiving warehouse')).not.toBeInTheDocument();
    for (const [label, value] of [['Expense reference', 'E-001'], ['Expense date', '2026-11-08'], ['Expense category', 'Office'], ['Expense description', 'Exact fractional expense'], ['Net expense amount', '0.003']]) fireEvent.change(screen.getByLabelText(label!), { target: { value } });
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(api.purchaseCommand).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled());
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(api.purchaseCommand).toHaveBeenCalledTimes(2));
    const first = vi.mocked(api.purchaseCommand).mock.calls[0]!; const second = vi.mocked(api.purchaseCommand).mock.calls[1]!;
    expect(first[0]).toBe('expenses'); expect(first[1]).toMatchObject({ amount: '0.003', category: 'Office', taxMode: 'NONE' }); expect(first[1]).toEqual(second[1]);
  });
  it('keeps bill view permission independent from posting and order approval', async () => {
    access.permissions = new Set(['supplier-bills.view']);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/purchasing?tab=bills']}><PurchasingPage /></MemoryRouter></QueryClientProvider>);
    await waitFor(() => expect(api.listPurchases).toHaveBeenCalledWith('bills', expect.anything(), expect.anything())); expect(screen.queryByText('Create supplier bill draft')).not.toBeInTheDocument(); expect(screen.queryByRole('tab', { name: 'Purchase orders' })).not.toBeInTheDocument();
  });
});
