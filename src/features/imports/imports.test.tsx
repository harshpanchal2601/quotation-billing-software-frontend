import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ImportsPage } from './ImportsPage';
import * as api from './imports.api';
const access = vi.hoisted(() => ({ firmId: 1, actorId: 10, permissions: new Set<string>() }));
vi.mock('@shared/tenancy/useFirmId', () => ({ useFirmId: () => access.firmId }));
vi.mock('@features/auth', async (original) => ({ ...(await original<typeof import('@features/auth')>()), useAuth: () => ({ user: { id: access.actorId } }), useHasPermission: (...permissions: string[]) => permissions.some((permission) => access.permissions.has(permission)) }));
vi.mock('./imports.api', async (original) => ({ ...(await original<typeof import('./imports.api')>()), loadImports: vi.fn(), loadImport: vi.fn(), previewImport: vi.fn(), commitImport: vi.fn(), compensateImport: vi.fn() }));
const preview = (): api.ImportDetail => ({ batch: { id: 1, target: 'CUSTOMERS', version: 1, status: 'PENDING', totalRecords: 1, successfulRecords: 0, failedRecords: 0, startedAt: '' }, rows: [{ id: 11, sourceIdentifier: 'c-1', status: 'APPROVED', rawData: { name: 'Private imported customer' }, errorMessage: null, targetId: null, compensatedAt: null }] });
const client = () => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
const tree = (cache: QueryClient) => <QueryClientProvider client={cache}><ImportsPage /></QueryClientProvider>;
beforeEach(() => {
  vi.resetAllMocks(); access.firmId = 1; access.actorId = 10; access.permissions = new Set(['imports.manage', 'companies.manage']);
  vi.mocked(api.loadImports).mockResolvedValue({ batches: [], pagination: { totalPages: 0 } });
  vi.mocked(api.loadImport).mockResolvedValue(preview()); vi.mocked(api.previewImport).mockResolvedValue(preview());
});
afterEach(cleanup);
describe('controlled import workspace', () => {
  it('previews before committing and sends the current server batch version', async () => {
    render(tree(client()));
    const csv = 'externalId,name\nc-1,Private imported customer';
    fireEvent.change(screen.getByLabelText('CSV content'), { target: { value: csv } });
    await userEvent.click(screen.getByRole('button', { name: 'Preview import' }));
    expect(await screen.findByText('Private imported customer')).toBeInTheDocument();
    expect(api.previewImport).toHaveBeenCalledWith('CUSTOMERS', csv); expect(api.commitImport).not.toHaveBeenCalled();
    const imported = preview(); imported.batch = { ...imported.batch, version: 2, status: 'COMPLETED', successfulRecords: 1 }; imported.rows[0] = { ...imported.rows[0]!, status: 'IMPORTED', targetId: 21 };
    vi.mocked(api.commitImport).mockResolvedValue(imported); vi.mocked(api.loadImport).mockResolvedValue(imported);
    await userEvent.click(screen.getByRole('button', { name: 'Commit approved rows' }));
    await waitFor(() => expect(api.commitImport).toHaveBeenCalledWith(expect.objectContaining({ id: 1, version: 1 })));
    expect(await screen.findByText('Created record #21')).toBeInTheDocument();
  });
  it('explains missing source permissions and blocks preview', async () => {
    access.permissions = new Set(['imports.manage']); render(tree(client()));
    expect(screen.getByText(/Customer or item management permission/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preview import' })).toBeDisabled();
  });
  it('clears selected private rows when the firm and actor change', async () => {
    const cache = client(); const view = render(tree(cache));
    fireEvent.change(screen.getByLabelText('CSV content'), { target: { value: 'externalId,name\nc-1,Private imported customer' } });
    await userEvent.click(screen.getByRole('button', { name: 'Preview import' })); await screen.findByText('Private imported customer');
    access.firmId = 2; access.actorId = 20; view.rerender(tree(cache));
    expect(screen.queryByText('Private imported customer')).not.toBeInTheDocument();
    expect(screen.getByLabelText('CSV content')).toHaveValue('');
  });
});
