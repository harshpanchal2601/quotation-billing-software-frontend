import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuditLogsPage } from './AuditLogsPage';
import { listAuditLogsRequest, type AuditLog } from './audit-logs.api';

const context = vi.hoisted(() => ({ firmId: 3, actorId: 6 }));
vi.mock('@features/auth', () => ({ useAuth: () => ({ user: { id: context.actorId } }) }));
vi.mock('@shared/tenancy/useFirmId', () => ({ useFirmId: () => context.firmId }));
vi.mock('./audit-logs.api', () => ({ listAuditLogsRequest: vi.fn() }));
const entry: AuditLog = { id: 1739, entityType: 'AccountingMapping', entityId: '3:1', action: 'UPDATE', createdAt: '2026-11-11T10:00:00Z', user: { id: 6, name: 'QA Admin', email: 'qa@example.invalid' }, ipAddress: null, oldValues: { version: 1, receivables: 'QA-AR-1100', exact: '9007199254740993.01' }, newValues: { version: 2, receivables: 'QA-AR-1200', exact: '9007199254740993.02' } };
const page = { auditLogs: [entry], pagination: { page: 1, limit: 20, total: 21, totalPages: 2 } };
function mount() {
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const ui = () => <QueryClientProvider client={cache}><MemoryRouter><AuditLogsPage /></MemoryRouter></QueryClientProvider>;
  const view = render(ui());
  return { ...view, rerenderContext: () => view.rerender(ui()) };
}
beforeEach(() => { vi.clearAllMocks(); context.firmId = 3; context.actorId = 6; vi.mocked(listAuditLogsRequest).mockResolvedValue(page); });

describe('audit activity workspace', () => {
  it('keeps list rows compact and shows both exact snapshots only in the selected detail', async () => {
    mount();
    const table = await screen.findByRole('table', { name: 'Audit logs' });
    expect(within(table).getByText('Updated')).toBeInTheDocument();
    expect(within(table).getByText('Accounting mapping')).toBeInTheDocument();
    expect(within(table).queryByText('QA-AR-1100')).not.toBeInTheDocument();
    await userEvent.click(within(table).getByRole('button', { name: 'View changes' }));
    const dialog = screen.getByRole('dialog', { name: 'Activity #1739' });
    expect(within(dialog).getByText('Before the change')).toBeInTheDocument();
    expect(within(dialog).getByText('After the change')).toBeInTheDocument();
    expect(within(dialog).getByText('QA-AR-1100')).toBeInTheDocument();
    expect(within(dialog).getByText('QA-AR-1200')).toBeInTheDocument();
    expect(within(dialog).getByText('9007199254740993.01')).toBeInTheDocument();
    expect(within(dialog).getByText('9007199254740993.02')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByText('Original audit data'));
    expect(dialog.querySelector('details')).toHaveAttribute('open');
    expect(dialog.querySelector('pre')).toHaveTextContent('"oldValues"');
    expect(dialog.querySelector('pre')).toHaveTextContent('9007199254740993.02');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
  it.each(['actor', 'firm'] as const)('clears selected private details and uses a fresh query when the %s changes', async (changed) => {
    const view = mount();
    await userEvent.click(await screen.findByRole('button', { name: 'View changes' }));
    vi.mocked(listAuditLogsRequest).mockResolvedValue({ auditLogs: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
    if (changed === 'actor') context.actorId = 8; else context.firmId = 4;
    view.rerenderContext();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByText('No audit activity has been recorded for this firm.')).toBeInTheDocument();
    expect(screen.queryByText('QA-AR-1100')).not.toBeInTheDocument();
    expect(listAuditLogsRequest).toHaveBeenCalledTimes(2);
  });
  it('orders before pagination and resets the page when sorting changes', async () => {
    mount();
    await userEvent.click(await screen.findByRole('button', { name: 'Go to next page' }));
    await waitFor(() => expect(listAuditLogsRequest).toHaveBeenCalledWith(2, 20, { sortBy: 'createdAt', sortOrder: 'desc' }, expect.any(AbortSignal)));
    await userEvent.click(await screen.findByRole('button', { name: 'Date' }));
    await waitFor(() => expect(listAuditLogsRequest).toHaveBeenLastCalledWith(1, 20, { sortBy: 'createdAt', sortOrder: 'asc' }, expect.any(AbortSignal)));
  });
  it('recovers a failed list read through the shared retry control', async () => {
    vi.mocked(listAuditLogsRequest).mockRejectedValueOnce(new Error('Unavailable'));
    mount();
    const retry = await screen.findByRole('button', { name: 'Retry' });
    fireEvent.click(retry);
    expect(await screen.findByRole('table', { name: 'Audit logs' })).toBeInTheDocument();
  });
});
