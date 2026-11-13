import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NotificationProvider } from '@shared/ui/feedback';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PERMISSIONS } from '@features/auth';
import { ReceiptForm } from './ReceiptForm';
import { InvoiceSettlementPanel } from './InvoiceSettlementPanel';
import { ReceivablesPanel } from './ReceivablesPanel';
import { paymentsKeys } from './payments.queries';
import * as api from './payments.api';
import type { Payment, Receivables } from './payments.types';

const access = vi.hoisted(() => ({ firmId: 1, permissions: new Set<string>() }));
vi.mock('@features/auth', async (original) => ({ ...(await original<typeof import('@features/auth')>()), useHasPermission: (...values: string[]) => values.some((value) => access.permissions.has(value)) }));
vi.mock('@shared/tenancy/useFirmId', () => ({ useFirmId: () => access.firmId }));
vi.mock('./payments.api');
const balances: Receivables = { asOf: '2026-11-03', timezone: 'Asia/Kolkata', receivables: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }, buckets: [{ currency: 'INR', bucket: 'DAYS_1_30', amount: '100.00', count: 1 }, { currency: 'USD', bucket: 'CURRENT', amount: '25.00', count: 1 }], customerCredits: [{ currency: 'KWD', unapplied: '0.101' }] };
function wrap(ui: React.ReactNode) { const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } }); return render(<QueryClientProvider client={client}><NotificationProvider><MemoryRouter>{ui}</MemoryRouter></NotificationProvider></QueryClientProvider>); }
beforeEach(() => {
  vi.clearAllMocks(); access.firmId = 1; access.permissions = new Set(Object.values(PERMISSIONS));
  vi.mocked(api.getPaymentCustomers).mockResolvedValue([{ id: 7, name: 'Customer Seven' }]);
  vi.mocked(api.getReceivables).mockResolvedValue(structuredClone(balances));
  vi.mocked(api.getInvoiceSettlement).mockResolvedValue({ id: 11, companyId: 7, currency: 'INR', adjustedTotal: '100.00', outstanding: '40.00', allocated: '60.00', settlementStatus: 'PARTIAL', overdue: true, allocations: [{ id: 1, paymentId: 12, reference: 'BANK-12', amount: '60.00', active: true, createdById: 1, createdAt: '2026-11-03T00:00:00Z' }] });
});
describe('customer receipt and balance workflows', () => {
  it('resolves the linked customer outside the first search page without searching programmatic labels', async () => {
    vi.mocked(api.getPaymentCustomers).mockImplementation(async (_search, _signal, id) => id === 87 ? [{ id: 87, name: 'Linked customer beyond first page' }] : [{ id: 7, name: 'Customer Seven' }]);
    wrap(<ReceiptForm companyId={87} onSaved={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole('combobox', { name: /Receipt customer/ })).toHaveValue('Linked customer beyond first page'));
    expect(api.getPaymentCustomers).toHaveBeenCalledWith('', expect.any(AbortSignal), 87);
    expect(vi.mocked(api.getPaymentCustomers).mock.calls.every(([search]) => search === '')).toBe(true);
    fireEvent.change(screen.getByRole('combobox', { name: /Receipt customer/ }), { target: { value: 'Edited customer' } });
    await waitFor(() => expect(api.getPaymentCustomers).toHaveBeenCalledWith('Edited customer', expect.any(AbortSignal)));
  });
  it('requires receipt confirmation and preserves decimal strings and retry keys', async () => {
    const saved = vi.fn(); vi.mocked(api.recordPayment).mockResolvedValue({ id: 12 } as Payment);
    wrap(<ReceiptForm companyId={7} onSaved={saved} />);
    expect(screen.getByRole('button', { name: 'Record confirmed receipt' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Receipt amount', { exact: false }), { target: { value: '100.10' } });
    fireEvent.change(screen.getByLabelText('Receipt reference', { exact: false }), { target: { value: 'BANK-12' } });
    await userEvent.click(screen.getByLabelText('I confirm these funds were received and cleared.'));
    await userEvent.click(screen.getByRole('button', { name: 'Record confirmed receipt' }));
    await waitFor(() => expect(api.recordPayment).toHaveBeenCalledWith(expect.objectContaining({ companyId: 7, amount: '100.10', confirmed: true, allocations: [], idempotencyKey: expect.any(String) })));
    expect(saved).toHaveBeenCalledWith(expect.objectContaining({ id: 12 }));
  });
  it('displays currency-partitioned ageing and exact unapplied credit', async () => {
    wrap(<ReceivablesPanel companyId={7} />);
    const ageing = await screen.findByRole('table', { name: 'Ageing by currency' });
    expect(within(ageing).getByRole('cell', { name: '100.00' })).toBeInTheDocument();
    expect(within(ageing).getByRole('cell', { name: '25.00' })).toBeInTheDocument();
    expect(within(screen.getByRole('table', { name: 'Available customer credit' })).getByRole('cell', { name: '0.101' })).toBeInTheDocument();
  });
  it('shows ledger-derived partial settlement and links to receipt provenance', async () => {
    wrap(<InvoiceSettlementPanel invoiceId={11} />);
    expect(await screen.findByText('Partially paid · Past due')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'BANK-12' })).toHaveAttribute('href', '/payments/12');
    expect(screen.getByRole('link', { name: 'Record or allocate a customer receipt' })).toHaveAttribute('href', '/payments?companyId=7&currency=INR');
  });
  it('does not fetch balances without payment access and isolates query keys by firm', () => {
    access.permissions.clear(); wrap(<><InvoiceSettlementPanel invoiceId={11} /><ReceivablesPanel companyId={7} /></>);
    expect(api.getReceivables).not.toHaveBeenCalled(); expect(api.getInvoiceSettlement).not.toHaveBeenCalled();
    expect(paymentsKeys.detail(1, 12)).not.toEqual(paymentsKeys.detail(2, 12));
  });
});
