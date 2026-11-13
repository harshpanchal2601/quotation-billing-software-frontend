import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationProvider } from '@shared/ui/feedback';
import { downloadBlob } from '@shared/api/download';
import { AccountingExportPanel } from './AccountingExportPanel';
import { ExportJobsPanel } from './ExportJobsPanel';
import * as api from './reports.api';
import type { AccountingConfiguration, ExportJobPage, ReportFilters } from './reports.types';

vi.mock('@shared/tenancy/useFirmId', () => ({ useFirmId: () => 1 }));
vi.mock('@features/auth', async (original) => ({ ...(await original<typeof import('@features/auth')>()), useAuth: () => ({ user: { id: 10 } }), useHasPermission: () => true }));
vi.mock('@shared/api/download', () => ({ downloadBlob: vi.fn() }));
vi.mock('./reports.api', async (original) => ({ ...(await original<typeof import('./reports.api')>()), loadExportJobs: vi.fn(), queueExport: vi.fn(), removeExport: vi.fn(), downloadExport: vi.fn(), loadAccountingMapping: vi.fn(), publishAccountingMapping: vi.fn(), downloadAccountingJournal: vi.fn() }));

const filters: ReportFilters = { dateFrom: '2026-11-01', dateTo: '2026-11-10', sections: ['sales'] };
const jobs: ExportJobPage = { workerEnabled: true, pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }, jobs: [{ id: 'job-1', format: 'csv', filters, fileSize: 12, fileHash: 'hash', completedAt: '2026-11-10T00:00:00Z', event: { status: 'SUCCEEDED', attempts: 1, maxAttempts: 3 } }] };
const config: AccountingConfiguration = { mapping: { version: 4, mapping: { receivables: '1100', sales: '4100', outputTax: '2100', rounding: '5100' } } };
function mount(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><NotificationProvider><MemoryRouter>{ui}</MemoryRouter></NotificationProvider></QueryClientProvider>);
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.loadExportJobs).mockResolvedValue(jobs);
  vi.mocked(api.removeExport).mockResolvedValue(undefined);
  vi.mocked(api.loadAccountingMapping).mockResolvedValue(config);
});

describe('report export actions', () => {
  it('queues one private export when confirmation is clicked repeatedly before rendering pending state', async () => {
    let finish!: (result: Awaited<ReturnType<typeof api.queueExport>>) => void;
    vi.mocked(api.queueExport).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    mount(<ExportJobsPanel filters={filters} format="csv" />);
    const queue = screen.getByRole('button', { name: 'Queue CSV export' });
    await waitFor(() => expect(queue).toBeEnabled());
    act(() => { queue.click(); queue.click(); });
    await waitFor(() => expect(api.queueExport).toHaveBeenCalledTimes(1));
    expect(queue).toBeDisabled();
    expect(api.queueExport).toHaveBeenCalledWith(filters, 'csv', expect.any(String));
    await act(async () => { finish(undefined); });
    await waitFor(() => expect(queue).toBeEnabled());
  });
  it('retains a pending export removal dialog and submits only once', async () => {
    let finish!: () => void;
    vi.mocked(api.removeExport).mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
    mount(<ExportJobsPanel filters={filters} format="csv" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Remove export job' }));
    const review = within(screen.getByRole('dialog')); const confirm = review.getByRole('button', { name: 'Remove export job' }); const cancel = review.getByRole('button', { name: 'Cancel' });
    act(() => { confirm.click(); confirm.click(); cancel.click(); });
    await waitFor(() => expect(api.removeExport).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('dialog')).toBeInTheDocument(); expect(confirm).toBeDisabled(); expect(cancel).toBeDisabled();
    await act(async () => { finish(); });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
  it('names records in a table and waits for confirmation before removing a private export', async () => {
    mount(<ExportJobsPanel filters={filters} format="csv" />);
    expect(await screen.findByRole('table', { name: 'Queued export jobs' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Remove export job' }));
    expect(api.removeExport).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog', { name: 'Remove export job?' });
    expect(dialog).toHaveTextContent('2026-11-01 to 2026-11-10');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Remove export job' }));
    await waitFor(() => expect(api.removeExport).toHaveBeenCalledWith('job-1', expect.anything()));
    expect(await screen.findByRole('status')).toHaveTextContent('Export job removed.');
  });
  it('aborts a pending download on unmount and never downloads a late result', async () => {
    let finish!: (blob: Blob) => void;
    vi.mocked(api.downloadExport).mockImplementation(() => new Promise<Blob>((resolve) => { finish = resolve; }));
    const view = mount(<ExportJobsPanel filters={filters} format="csv" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Download CSV' }));
    const signal = vi.mocked(api.downloadExport).mock.calls[0]![1]!;
    view.unmount(); expect(signal.aborted).toBe(true);
    finish(new Blob(['private export']));
    await waitFor(() => expect(downloadBlob).not.toHaveBeenCalled());
  });
  it('keeps edited codes after a failed publication and closes only after the successful retry', async () => {
    vi.mocked(api.publishAccountingMapping).mockRejectedValueOnce(new Error('Publication unavailable')).mockResolvedValueOnce({ mapping: { ...config.mapping!, version: 5, mapping: { ...config.mapping!.mapping, sales: '4200' } } });
    mount(<AccountingExportPanel dateFrom={filters.dateFrom} dateTo={filters.dateTo} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Edit account mapping' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Sales account' }), { target: { value: '4200' } });
    await userEvent.click(screen.getByRole('button', { name: 'Publish new mapping version' }));
    await userEvent.click(screen.getByRole('button', { name: 'Publish mapping' }));
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Sales account' })).toHaveValue('4200'));
    expect(screen.getByRole('dialog', { name: 'Account mapping' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Publish new mapping version' }));
    await userEvent.click(screen.getByRole('button', { name: 'Publish mapping' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(api.publishAccountingMapping).toHaveBeenNthCalledWith(2, 4, { ...config.mapping!.mapping, sales: '4200' });
    expect(screen.getByText('Published mapping version 5')).toBeInTheDocument();
  });
  it('downloads once with the reviewed period and mapping and aborts on unmount', async () => {
    let finish!: (blob: Blob) => void;
    vi.mocked(api.downloadAccountingJournal).mockImplementationOnce(() => new Promise<Blob>((resolve) => { finish = resolve; }));
    const view = mount(<AccountingExportPanel dateFrom={filters.dateFrom} dateTo={filters.dateTo} />);
    const button = screen.getByRole('button', { name: 'Export billing journal CSV' });
    await waitFor(() => expect(button).toBeEnabled());
    act(() => { button.click(); button.click(); });
    await waitFor(() => expect(api.downloadAccountingJournal).toHaveBeenCalledTimes(1));
    expect(api.downloadAccountingJournal).toHaveBeenCalledWith(filters.dateFrom, filters.dateTo, 4, expect.any(AbortSignal));
    const signal = vi.mocked(api.downloadAccountingJournal).mock.calls[0]![3]!;
    view.unmount(); expect(signal.aborted).toBe(true);
    await act(async () => { finish(new Blob(['private journal'])); });
    expect(downloadBlob).not.toHaveBeenCalled();
  });
  it('publishes the displayed mapping version only after reviewing the confirmation', async () => {
    vi.mocked(api.publishAccountingMapping).mockResolvedValue({ mapping: { ...config.mapping!, version: 5, mapping: { ...config.mapping!.mapping, sales: '4200' } } });
    mount(<AccountingExportPanel dateFrom={filters.dateFrom} dateTo={filters.dateTo} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Edit account mapping' }));
    await screen.findByDisplayValue('1100');
    fireEvent.change(screen.getByRole('textbox', { name: 'Sales account' }), { target: { value: '4200' } });
    await userEvent.click(screen.getByRole('button', { name: 'Publish new mapping version' }));
    expect(api.publishAccountingMapping).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Publish mapping' }));
    await waitFor(() => expect(api.publishAccountingMapping).toHaveBeenCalledWith(4, { ...config.mapping!.mapping, sales: '4200' }));
    expect(await screen.findByText('Published mapping version 5')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('4200')).toBeInTheDocument();
  });
});
