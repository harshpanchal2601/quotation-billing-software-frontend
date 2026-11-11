import { NotificationProvider } from '@shared/ui/feedback';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SalesOrderDetailsPage } from './SalesOrderDetailsPage';
import * as api from './sales-orders.api';

vi.mock('@features/auth', async (original) => ({ ...(await original<typeof import('@features/auth')>()), useHasPermission: () => true }));
vi.mock('@shared/tenancy/useFirmId', () => ({ useFirmId: () => 1 }));
vi.mock('@features/invoices', () => ({ OrderInvoiceConversion: () => null }));
vi.mock('./sales-orders.api', async (original) => ({ ...(await original<typeof import('./sales-orders.api')>()), getSalesOrder: vi.fn(), recordFulfillment: vi.fn(), cancelSalesRecord: vi.fn() }));
const order: api.SalesOrder = { id: 12, version: 1, orderNumber: 'SO-000012', status: 'OPEN', companyId: 7, sourceQuotationId: 44, currency: 'INR', snapshot: { companyName: 'Buyer', revisionNumber: 3, grandTotal: '10.00', taxMode: 'NONE', paymentTerms: null, termsAndConditions: null }, lines: [{ id: 31, lineNumber: 1, quantity: '1.000', fulfilled: '0.000', reserved: '0.000', available: '0.000', snapshot: { itemName: 'Service', measurementUnit: 'HOUR', unitRate: '10.00' } }], fulfillments: [], invoices: [], history: [], pagination: { history: { page: 1, limit: 20, total: 0 }, completions: { page: 1, limit: 20, total: 0 }, invoices: { page: 1, limit: 20, total: 0 } } };
beforeEach(() => { vi.clearAllMocks(); vi.mocked(api.getSalesOrder).mockResolvedValue(order); });
describe('order completion workflow', () => {
  it('resets only the sorted history page and preserves the other read windows', async () => {
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}><NotificationProvider><MemoryRouter initialEntries={['/sales-orders/12?historyPage=2&completionPage=3&invoicePage=1&completionSortBy=reference&completionSortOrder=asc']}><Routes><Route path="/sales-orders/:id" element={<SalesOrderDetailsPage />} /></Routes></MemoryRouter></NotificationProvider></QueryClientProvider>);
    await screen.findByText('SO-000012');
    expect(api.getSalesOrder).toHaveBeenLastCalledWith(12, expect.any(AbortSignal), 2, expect.objectContaining({ completionPage: 3, invoicePage: 1, completionSortBy: 'reference', completionSortOrder: 'asc' }));
    await userEvent.click(within(screen.getByRole('table', { name: 'Order status history' })).getByRole('button', { name: 'Version' }));
    await waitFor(() => expect(api.getSalesOrder).toHaveBeenLastCalledWith(12, expect.any(AbortSignal), 1, expect.objectContaining({ historySortBy: 'version', historySortOrder: 'asc', completionPage: 3, invoicePage: 1, completionSortBy: 'reference', completionSortOrder: 'asc' })));
    expect(screen.getByRole('button', { name: 'Invoice completed quantities' })).toBeDisabled();
  });
  it('keeps exact decimal quantities and stable retry identity after a failed request', async () => {
    vi.mocked(api.recordFulfillment).mockRejectedValue(new Error('Disconnected'));
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } })}><NotificationProvider><MemoryRouter initialEntries={['/sales-orders/12']}><Routes><Route path="/sales-orders/:id" element={<SalesOrderDetailsPage />} /></Routes></MemoryRouter></NotificationProvider></QueryClientProvider>);
    await screen.findByText('SO-000012');
    await userEvent.click(screen.getByRole('button', { name: 'Record delivery / service completion' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Dispatch / completion reference' }), { target: { value: 'D-001' } }); fireEvent.change(screen.getByRole('textbox', { name: 'Completed quantity: Service' }), { target: { value: '0.003' } });
    await userEvent.click(screen.getByRole('button', { name: 'Record completion' }));
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Record delivery / service completion?' })).getByRole('button', { name: 'Record completion' }));
    await waitFor(() => expect(api.recordFulfillment).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Record delivery / service completion?' })).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Record completion' })).not.toBeDisabled());
    await userEvent.click(screen.getByRole('button', { name: 'Record completion' }));
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Record delivery / service completion?' })).getByRole('button', { name: 'Record completion' }));
    await waitFor(() => expect(api.recordFulfillment).toHaveBeenCalledTimes(2));
    expect(vi.mocked(api.recordFulfillment).mock.calls[0]![0]).toEqual(vi.mocked(api.recordFulfillment).mock.calls[1]![0]);
    expect(vi.mocked(api.recordFulfillment).mock.calls[0]![0].lines).toEqual([{ salesOrderLineId: 31, quantity: '0.003' }]);
  });
});
