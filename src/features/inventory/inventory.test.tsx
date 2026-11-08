import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InventoryPage } from './InventoryPage';
import * as api from './inventory.api';
import { WarehouseField } from './WarehouseField';

const access = vi.hoisted(() => ({ firmId: 1, permissions: new Set<string>() }));
vi.mock('@shared/tenancy/useFirmId', () => ({ useFirmId: () => access.firmId }));
vi.mock('@features/auth', async (original) => ({ ...(await original<typeof import('@features/auth')>()), useHasPermission: (...permissions: string[]) => permissions.some((permission) => access.permissions.has(permission)) }));
vi.mock('./inventory.api', async (original) => ({ ...(await original<typeof import('./inventory.api')>()), listWarehouses: vi.fn(), stockOptions: vi.fn(), listStock: vi.fn(), listMovements: vi.fn(), listReservations: vi.fn(), inventoryCommand: vi.fn() }));
const position = (name = 'Goods A', reconciled = true): api.StockPosition => ({ id: 1, warehouseId: 1, itemId: 1, warehouse: { id: 1, code: 'MAIN', name: 'Main', isActive: true }, item: { name, itemCode: 'SKU1' }, currency: 'INR', onHand: '10.000', reserved: '2.000', available: '8.000', value: '20.000000', averageCost: '2.000000', reorderLevel: '9.000', lowStock: true, reconciled, openingQuantity: '0.000', closingQuantity: '10.000', openingValue: '0.000000', closingValue: '20.000000' });
const page = { page: 1, limit: 20, total: 1 };
beforeEach(() => {
  vi.clearAllMocks(); access.firmId = 1; access.permissions = new Set(['inventory.view']);
  vi.mocked(api.listWarehouses).mockResolvedValue([]); vi.mocked(api.stockOptions).mockResolvedValue({ items: [] }); vi.mocked(api.listStock).mockResolvedValue({ positions: [position()], pagination: page }); vi.mocked(api.listMovements).mockResolvedValue({ movements: [], pagination: { ...page, total: 0 } }); vi.mocked(api.listReservations).mockResolvedValue({ reservations: [], pagination: { ...page, total: 0 } });
});
afterEach(cleanup);
describe('inventory workspace', () => {
  it('shows exact balances and low-stock warnings without exposing unauthorized actions', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    render(<QueryClientProvider client={client}><MemoryRouter><InventoryPage /></MemoryRouter></QueryClientProvider>);
    expect(await screen.findByText('Goods A')).toBeInTheDocument(); expect(screen.getByText('8.000')).toBeInTheDocument(); expect(screen.getByText('Low stock')).toBeInTheDocument(); expect(screen.queryByRole('tab', { name: 'Stock operations' })).not.toBeInTheDocument();
  });
  it('surfaces reconciliation failure and scopes balance caches when firms change', async () => {
    vi.mocked(api.listStock).mockResolvedValueOnce({ positions: [position('Goods A', false)], pagination: page });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    const tree = () => <QueryClientProvider client={client}><MemoryRouter><InventoryPage /></MemoryRouter></QueryClientProvider>;
    const view = render(tree()); expect(await screen.findByText(/projections differ from ledger/)).toBeInTheDocument();
    vi.mocked(api.listStock).mockResolvedValue({ positions: [position('Goods B')], pagination: page }); access.firmId = 2; view.rerender(tree());
    expect(await screen.findByText('Goods B')).toBeInTheDocument(); expect(screen.queryByText('Goods A')).not.toBeInTheDocument();
    const firms = client.getQueryCache().findAll({ queryKey: ['inventory'] }).map((query) => query.queryKey[1]); expect(firms).toContain(1); expect(firms).toContain(2);
  });
  it('gates stock adjustments separately from transfers and ordinary warehouse management', async () => {
    access.permissions.add('inventory.manage');
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    render(<QueryClientProvider client={client}><MemoryRouter><InventoryPage /></MemoryRouter></QueryClientProvider>);
    await userEvent.click(await screen.findByRole('tab', { name: 'Stock operations' }));
    await waitFor(() => expect(screen.getByText('Transfer and receive stock')).toBeInTheDocument()); expect(screen.queryByText('Record stock adjustment')).not.toBeInTheDocument();
  });
  it('finds warehouses through server search and submits the selected identifier', async () => {
    const load = vi.fn(async (search: string) => search.includes('Remote') ? [{ id: 201, name: 'Remote warehouse' }] : []);
    const used = vi.fn(); const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    render(<QueryClientProvider client={client}><form onSubmit={(event) => { event.preventDefault(); used(new FormData(event.currentTarget).get('warehouseId')); }}><WarehouseField name="warehouseId" label="Choose warehouse" context="inventory" load={load} required /><button type="submit">Use warehouse</button></form></QueryClientProvider>);
    await userEvent.type(screen.getByRole('combobox', { name: 'Choose warehouse' }), 'Remote');
    await userEvent.click(await screen.findByRole('option', { name: 'Remote warehouse' }));
    await userEvent.click(screen.getByRole('button', { name: 'Use warehouse' }));
    expect(used).toHaveBeenCalledWith('201'); expect(load.mock.calls.some(([search]) => search === 'Remote')).toBe(true);
  });
});
