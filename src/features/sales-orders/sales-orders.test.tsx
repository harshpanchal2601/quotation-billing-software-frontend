import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SalesOrderDetailsPage } from './SalesOrderDetailsPage';
import * as api from './sales-orders.api';

vi.mock('@features/auth', async (original) => ({ ...(await original<typeof import('@features/auth')>()), useHasPermission: () => true }));
vi.mock('@shared/tenancy/useFirmId', () => ({ useFirmId: () => 1 }));
vi.mock('@features/invoices', () => ({ OrderInvoiceConversion: () => null }));
vi.mock('./sales-orders.api', async (original) => ({ ...(await original<typeof import('./sales-orders.api')>()), getSalesOrder: vi.fn(), recordFulfillment: vi.fn(), cancelSalesRecord: vi.fn() }));
const order: api.SalesOrder = { id: 12, version: 1, orderNumber: 'SO-000012', status: 'OPEN', companyId: 7, sourceQuotationId: 44, currency: 'INR', snapshot: { companyName: 'Buyer', revisionNumber: 3, grandTotal: '10.00', taxMode: 'NONE', paymentTerms: null, termsAndConditions: null }, lines: [{ id: 31, lineNumber: 1, quantity: '1.000', fulfilled: '0.000', reserved: '0.000', available: '0.000', snapshot: { itemName: 'Service', measurementUnit: 'HOUR', unitRate: '10.00' } }], fulfillments: [], invoices: [], history: [] };
beforeEach(() => { vi.clearAllMocks(); vi.mocked(api.getSalesOrder).mockResolvedValue(order); });
describe('order completion workflow', () => {
  it('keeps exact decimal quantities and stable retry identity after a failed request', async () => {
    vi.mocked(api.recordFulfillment).mockRejectedValue(new Error('Disconnected'));
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } })}><MemoryRouter initialEntries={['/sales-orders/12']}><Routes><Route path="/sales-orders/:id" element={<SalesOrderDetailsPage />} /></Routes></MemoryRouter></QueryClientProvider>);
    await screen.findByText('SO-000012');
    fireEvent.change(screen.getByLabelText('Dispatch / completion reference'), { target: { value: 'D-001' } }); fireEvent.change(screen.getByLabelText('Completed quantity: Service'), { target: { value: '0.003' } });
    await userEvent.click(screen.getByRole('button', { name: 'Record completion' }));
    await waitFor(() => expect(api.recordFulfillment).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Record completion' })).not.toBeDisabled());
    await userEvent.click(screen.getByRole('button', { name: 'Record completion' }));
    await waitFor(() => expect(api.recordFulfillment).toHaveBeenCalledTimes(2));
    expect(vi.mocked(api.recordFulfillment).mock.calls[0]![0]).toEqual(vi.mocked(api.recordFulfillment).mock.calls[1]![0]);
    expect(vi.mocked(api.recordFulfillment).mock.calls[0]![0].lines).toEqual([{ salesOrderLineId: 31, quantity: '0.003' }]);
  });
});
