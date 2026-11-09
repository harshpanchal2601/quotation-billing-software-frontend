import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ManufacturingPage } from './ManufacturingPage';
import * as api from './manufacturing.api';

const access = vi.hoisted(() => ({ firmId: 1, permissions: new Set<string>() }));
vi.mock('@shared/tenancy/useFirmId', () => ({ useFirmId: () => access.firmId }));
vi.mock('@features/auth', async (original) => ({ ...(await original<typeof import('@features/auth')>()), useAuth: () => ({ user: { id: 10 } }), useHasPermission: (...permissions: string[]) => permissions.some((permission) => access.permissions.has(permission)) }));
vi.mock('./manufacturing.api', async (original) => ({ ...(await original<typeof import('./manufacturing.api')>()), loadBoms: vi.fn(), loadWorkOrders: vi.fn(), loadWorkOrder: vi.fn(), manufacturingItems: vi.fn(), manufacturingCommand: vi.fn() }));
const bom: api.Bom = { id: 1, code: 'ASSEMBLY-A', name: 'Assembly A', revision: 1, outputItemId: 1, outputName: 'Output', outputUnit: 'PCS', outputQuantity: '1.000', components: [{ id: 10, itemId: 2, name: 'Component', unit: 'PCS', quantity: '2.000' }] };
const order: api.WorkOrder = { id: 100, bomId: 1, warehouseId: 5, quantity: '2.000', currency: 'INR', status: 'COMPLETED', version: 2, snapshot: { bomCode: bom.code, bomRevision: 1, output: { itemId: 1, name: 'Output', unit: 'PCS', quantity: '2.000' }, components: [{ lineId: 10, itemId: 2, name: 'Component', unit: 'PCS', quantity: '4.000' }] }, movements: [{ id: 1, eventType: 'CONSUME', quantity: '-4.000', value: '-8.000004', originalMovementId: null }, { id: 2, eventType: 'PRODUCE', quantity: '2.000', value: '8.000004', originalMovementId: null }] };
function tree(client: QueryClient) { return <QueryClientProvider client={client}><ManufacturingPage /></QueryClientProvider>; }
function client() { return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } }); }
beforeEach(() => {
  vi.resetAllMocks(); access.firmId = 1; access.permissions = new Set(['manufacturing.view']);
  vi.mocked(api.loadBoms).mockResolvedValue({ records: [bom], pagination: { page: 1, limit: 20, total: 1 } });
  vi.mocked(api.loadWorkOrders).mockResolvedValue({ records: [order], pagination: { page: 1, limit: 20, total: 1 } });
  vi.mocked(api.loadWorkOrder).mockResolvedValue(order);
  vi.mocked(api.manufacturingItems).mockResolvedValue([{ id: 1, itemCode: 'OUT', name: 'Output' }, { id: 2, itemCode: 'COMP', name: 'Component' }]);
  vi.mocked(api.manufacturingCommand).mockResolvedValue({});
});
afterEach(cleanup);
describe('Wave 10 optional manufacturing workspace', () => {
  it('shows immutable recipes and source ledger values without exposing posting actions to viewers', async () => {
    render(tree(client())); await screen.findByText(/ASSEMBLY-A · Revision 1/);
    expect(screen.queryByText('Create immutable BOM version')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Work orders' }));
    await userEvent.click(await screen.findByRole('button', { name: 'View work order #100' }));
    expect(await screen.findByText(/Movement #2 · PRODUCE · Quantity 2.000 · INR 8.000004/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel work order' })).not.toBeInTheDocument();
  });
  it('submits explicit item IDs and decimal strings when creating a BOM version', async () => {
    access.permissions.add('manufacturing.manage'); render(tree(client())); await screen.findByText('Create immutable BOM version');
    await userEvent.type(screen.getByRole('textbox', { name: 'BOM code' }), 'ASSEMBLY');
    await userEvent.type(screen.getByRole('textbox', { name: 'BOM name' }), 'Reviewed assembly');
    await userEvent.click(screen.getByRole('combobox', { name: 'Finished item' }));
    await userEvent.click(await screen.findByRole('option', { name: 'OUT · Output' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Output quantity per BOM' }), '1.000');
    await userEvent.click(screen.getByRole('combobox', { name: 'Component 1' }));
    await userEvent.click(await screen.findByRole('option', { name: 'COMP · Component' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Component 1 quantity per BOM' }), '2.001');
    await userEvent.click(screen.getByRole('button', { name: 'Create BOM version' }));
    await waitFor(() => expect(api.manufacturingCommand).toHaveBeenCalledWith('/boms', { code: 'ASSEMBLY', name: 'Reviewed assembly', outputItemId: 1, outputQuantity: '1.000', components: [{ itemId: 2, quantity: '2.001' }], idempotencyKey: expect.any(String) }));
  });
  it('posts cancellation with the displayed version and a stable command key', async () => {
    access.permissions.add('manufacturing.post'); render(tree(client())); await screen.findByText(/ASSEMBLY-A · Revision 1/);
    await userEvent.click(screen.getByRole('tab', { name: 'Work orders' }));
    await userEvent.click(await screen.findByRole('button', { name: 'View work order #100' }));
    await userEvent.type(await screen.findByRole('textbox', { name: 'Reason' }), 'Reverse approved production');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel work order' }));
    await waitFor(() => expect(api.manufacturingCommand).toHaveBeenCalledWith('/work-orders/100/cancel', { expectedVersion: 2, reason: 'Reverse approved production', idempotencyKey: expect.any(String) }));
    expect(screen.queryByRole('button', { name: 'Consume components and receive output' })).not.toBeInTheDocument();
  });
  it('clears selected production context and cache results when the selected firm changes', async () => {
    const cache = client(); const view = render(tree(cache)); await screen.findByText(/ASSEMBLY-A · Revision 1/);
    access.firmId = 2; vi.mocked(api.loadBoms).mockResolvedValue({ records: [{ ...bom, code: 'ASSEMBLY-B', name: 'Assembly B' }], pagination: { page: 1, limit: 20, total: 1 } }); view.rerender(tree(cache));
    expect(await screen.findByText(/ASSEMBLY-B · Revision 1/)).toBeInTheDocument(); expect(screen.queryByText(/ASSEMBLY-A · Revision 1/)).not.toBeInTheDocument();
  });
});
