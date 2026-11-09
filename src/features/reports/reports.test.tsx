import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReportsPage } from './ReportsPage';
import * as api from './reports.api';
import type { ReportOverview } from './reports.types';

const access = vi.hoisted(() => ({ firmId: 1, actorId: 10, permissions: new Set<string>() }));
vi.mock('@shared/tenancy/useFirmId', () => ({ useFirmId: () => access.firmId }));
vi.mock('@features/auth', async (original) => ({ ...(await original<typeof import('@features/auth')>()),
  useAuth: () => ({ user: { id: access.actorId, name: 'Report reader' } }),
  useHasPermission: (...permissions: string[]) => permissions.some((permission) => access.permissions.has(permission)),
}));
vi.mock('./reports.api', async (original) => ({ ...(await original<typeof import('./reports.api')>()), loadReport: vi.fn(), loadSavedReports: vi.fn(), saveReportView: vi.fn(), deleteReportView: vi.fn(), downloadReport: vi.fn() }));
const report = (value = '9007199254740993.123', firmId = 1): ReportOverview => ({
  schemaVersion: 1, firmId, generatedAt: '2026-11-09T12:00:00.000Z', dateFrom: '2026-11-01', dateTo: '2026-11-09', currency: null, currencyPolicy: 'SEGMENTED_NO_CONVERSION',
  sections: [
    { key: 'sales', status: 'AVAILABLE', data: { source: 'invoices', basis: 'Issued invoices less credits, by document date.', dateBasis: 'PERIOD', asOf: '2026-11-09T12:00:00.000Z', timezone: 'UTC', scope: 'FIRM', metrics: [{ key: 'netSales', label: 'Net document sales', currency: 'KWD', dimension: null, value, unit: 'MONEY' }] } },
    { key: 'stock', status: 'UNAVAILABLE' },
  ],
});
function tree(client: QueryClient) { return <QueryClientProvider client={client}><ReportsPage /></QueryClientProvider>; }
function client() { return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } }); }
beforeEach(() => {
  vi.resetAllMocks(); access.firmId = 1; access.actorId = 10; access.permissions = new Set(['reports.view']);
  vi.mocked(api.loadReport).mockResolvedValue(report());
  vi.mocked(api.loadSavedReports).mockResolvedValue({ views: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe('Wave 10 business report workspace', () => {
  it('renders exact decimal values, source/date rules and unavailable sections without invented zeroes', async () => {
    render(tree(client()));
    expect(await screen.findByText('9007199254740993.123')).toBeInTheDocument();
    expect(screen.getByText('KWD')).toBeInTheDocument();
    expect(screen.getByText('Access to this report is unavailable for your role or subscription.')).toBeInTheDocument();
    expect(screen.getByText('Issued invoices less credits, by document date.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Export CSV' })).not.toBeInTheDocument();
    expect(screen.queryByText('0.00')).not.toBeInTheDocument();
  });
  it('shows loading and failure explicitly and lets a failed source read retry', async () => {
    vi.mocked(api.loadReport).mockRejectedValueOnce(new Error('Source unavailable'));
    render(tree(client()));
    await userEvent.click(await screen.findByRole('button', { name: 'Retry reports' }));
    expect(await screen.findByText('9007199254740993.123')).toBeInTheDocument();
    expect(api.loadReport).toHaveBeenCalledTimes(2);
  });
  it('isolates caches and visible data across both firm and actor changes', async () => {
    const cache = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    const view = render(tree(cache)); await screen.findByText('9007199254740993.123');
    vi.mocked(api.loadReport).mockResolvedValue(report('7.001', 2)); access.firmId = 2; access.actorId = 20; view.rerender(tree(cache));
    expect(await screen.findByText('7.001')).toBeInTheDocument(); expect(screen.queryByText('9007199254740993.123')).not.toBeInTheDocument();
    const scopes = cache.getQueryCache().findAll({ queryKey: ['reports'] }).map((query) => query.queryKey.slice(0, 3));
    expect(scopes).toContainEqual(['reports', 1, 10]); expect(scopes).toContainEqual(['reports', 2, 20]);
  });
  it('saves applied filters and sends optimistic versions on updates', async () => {
    const filters = { dateFrom: '2026-11-01', dateTo: '2026-11-09', sections: ['sales' as const] };
    const savedView = { id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', name: 'Sales', version: 3, filters, createdAt: '', updatedAt: '' };
    vi.mocked(api.loadSavedReports).mockResolvedValue({ views: [savedView], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } });
    vi.mocked(api.saveReportView).mockResolvedValue({ ...savedView, version: 4 });
    render(tree(client())); await screen.findByText('9007199254740993.123');
    await userEvent.click(screen.getByRole('combobox', { name: 'Saved report view' })); await userEvent.click(await screen.findByRole('option', { name: 'Sales' }));
    fireEvent.change(screen.getByLabelText('From date'), { target: { value: '2026-10-01' } });
    await userEvent.click(screen.getByRole('button', { name: 'Update view' }));
    await waitFor(() => expect(api.saveReportView).toHaveBeenCalledWith('Sales', filters, expect.objectContaining({ id: savedView.id, version: 3 })));
    expect(api.saveReportView).not.toHaveBeenCalledWith('Sales', expect.objectContaining({ dateFrom: '2026-10-01' }), expect.anything());
  });
  it('downloads only the applied report when export access is allowed', async () => {
    access.permissions.add('reports.export');
    const create = vi.fn(() => 'blob:report'); const revoke = vi.fn();
    vi.stubGlobal('URL', class extends URL { static createObjectURL = create; static revokeObjectURL = revoke; });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    vi.mocked(api.downloadReport).mockResolvedValue(new Blob(['csv']));
    try {
      render(tree(client())); await screen.findByText('9007199254740993.123');
      const applied = vi.mocked(api.loadReport).mock.calls[0]![0];
      fireEvent.change(screen.getByLabelText('Currency (optional)'), { target: { value: 'USD' } });
      await userEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
      await waitFor(() => expect(api.downloadReport).toHaveBeenCalledWith(applied, expect.any(AbortSignal)));
      expect(create).toHaveBeenCalledTimes(1); expect(revoke).toHaveBeenCalledWith('blob:report');
    } finally { vi.unstubAllGlobals(); }
  });
});
