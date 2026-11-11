import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationProvider } from '@shared/ui/feedback';
import { apiClient } from '@shared/api/apiClient';
import * as api from './api/automation.api';
import { TenantFieldsPanel } from './components/TenantFieldsPanel';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { AutomationPage } from './pages/AutomationPage';
import { initialDefinition, type Approval, type PublishedDefinition } from './model/automation.types';

const access = vi.hoisted(() => ({ firmId: 1, userId: 10, admin: true, allowed: true }));
vi.mock('@shared/tenancy/useFirmId', () => ({ useFirmId: () => access.firmId }));
vi.mock('@features/auth', async (original) => ({ ...(await original<typeof import('@features/auth')>()), useHasPermission: () => access.allowed, useAuth: () => ({ user: { id: access.userId, firmId: access.firmId, accountType: access.admin ? 'FIRM_ADMIN' : 'FIRM_USER' } }) }));
vi.mock('./api/automation.api', async (original) => ({ ...(await original<typeof import('./api/automation.api')>()), listDefinitions: vi.fn(), listRecipients: vi.fn(), listRuns: vi.fn(), listVersions: vi.fn(), previewDefinition: vi.fn(), publishDefinition: vi.fn(), listApprovals: vi.fn(), decideApproval: vi.fn(), performApprovedAction: vi.fn(), getPreferences: vi.fn(), getFieldValues: vi.fn(), saveFieldValues: vi.fn() }));
const fieldDefinition: PublishedDefinition = { id: 1, kind: 'CUSTOM_FIELDS', key: 'COMPANY', version: 1, publishedById: 10, publishedAt: '2026-11-08T00:00:00Z', definition: { enabled: true, entity: 'COMPANY', fields: [{ key: 'cf_project', label: 'Project reference', type: 'TEXT', required: true, searchable: false, visibility: 'INTERNAL', classification: 'BUSINESS', options: [] }] } };
function tree(children: ReactNode, client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } })) { return <QueryClientProvider client={client}><MemoryRouter><NotificationProvider>{children}</NotificationProvider></MemoryRouter></QueryClientProvider>; }
beforeEach(() => {
  vi.clearAllMocks(); access.firmId = 1; access.userId = 10; access.admin = true; access.allowed = true;
  vi.mocked(api.listDefinitions).mockResolvedValue([]); vi.mocked(api.listRecipients).mockResolvedValue([{ id: 10, name: 'Administrator A' }]); vi.mocked(api.listRuns).mockResolvedValue([]); vi.mocked(api.listVersions).mockResolvedValue([]); vi.mocked(api.getPreferences).mockResolvedValue(null); vi.mocked(api.listApprovals).mockResolvedValue([]);
  vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { success: true, data: { notifications: [] } } });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe('Wave 08 tenant configuration and approval UX', () => {
  it('keeps custom fields hidden without entitled access and loads them only on demand', async () => {
    access.allowed = false; const view = render(tree(<TenantFieldsPanel entity="COMPANY" entityId={1} editable />));
    expect(screen.queryByText('Additional business fields')).not.toBeInTheDocument(); expect(api.getFieldValues).not.toHaveBeenCalled();
    access.allowed = true;
    vi.mocked(api.getFieldValues).mockResolvedValue({ definition: fieldDefinition, current: null });
    view.rerender(tree(<TenantFieldsPanel entity="COMPANY" entityId={1} editable />));
    expect(api.getFieldValues).not.toHaveBeenCalled(); await userEvent.click(screen.getByRole('button', { name: 'Additional business fields' }));
    expect(await screen.findByRole('textbox', { name: /Project reference/ })).toBeInTheDocument();
  });
  it('isolates value caches across firm changes and submits a versioned definition reference', async () => {
    vi.mocked(api.getFieldValues).mockResolvedValue({ definition: fieldDefinition, current: { id: 1, version: 1, definitionId: 1, definition: fieldDefinition, values: { cf_project: 'Firm A private project' } } });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const view = render(tree(<TenantFieldsPanel entity="COMPANY" entityId={1} editable />, client));
    await userEvent.click(screen.getByRole('button', { name: 'Additional business fields' })); expect(await screen.findByDisplayValue('Firm A private project')).toBeInTheDocument();
    access.firmId = 2; vi.mocked(api.getFieldValues).mockResolvedValue({ definition: { ...fieldDefinition, id: 2 }, current: null });
    view.rerender(tree(<TenantFieldsPanel entity="COMPANY" entityId={2} editable />, client));
    await waitFor(() => expect(screen.queryByDisplayValue('Firm A private project')).not.toBeInTheDocument());
    await userEvent.type(await screen.findByRole('textbox', { name: /Project reference/ }), 'Firm B project'); await userEvent.click(screen.getByRole('button', { name: 'Save new value version' }));
    await waitFor(() => expect(api.saveFieldValues).toHaveBeenCalledWith('COMPANY', 2, 0, 2, { cf_project: 'Firm B project' }));
  });
  it('previews a workflow without publishing it or offering unrestricted actions', async () => {
    vi.mocked(api.previewDefinition).mockResolvedValue({ steps: [{ id: 'notify', type: 'NOTIFY' }, { id: 'finish', type: 'STOP' }], effects: 'NONE' });
    render(tree(<AutomationPage />)); await screen.findByText('No workflow runs yet.');
    expect(screen.queryByText(/arbitrary HTTP|run JavaScript/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Create configuration' }));
    await userEvent.click(screen.getByRole('button', { name: 'Validate and preview' })); expect(await screen.findByText('Preview completed without side effects.')).toBeInTheDocument(); expect(api.publishDefinition).not.toHaveBeenCalled();
    expect(api.previewDefinition).toHaveBeenCalledWith('WORKFLOW', 'new-workflow', initialDefinition('WORKFLOW'), expect.objectContaining({ entity: 'INVOICE', trigger: 'invoice.issued' }));
  });
  it('closes the configuration editor after a successful save and refreshes its numbered list', async () => {
    const saved: PublishedDefinition = { id: 3, kind: 'WORKFLOW', key: 'new-workflow', version: 1, definition: initialDefinition('WORKFLOW'), publishedById: 10, publishedAt: '2026-11-10T16:00:00Z' };
    vi.mocked(api.publishDefinition).mockImplementation(async () => { vi.mocked(api.listDefinitions).mockResolvedValue([saved]); return { definition: saved }; });
    render(tree(<AutomationPage />));
    await screen.findByText('No configurations');
    await userEvent.click(screen.getByRole('button', { name: 'Create configuration' }));
    expect(screen.getByRole('dialog', { name: 'Create configuration' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save version 1' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Create configuration' })).not.toBeInTheDocument());
    expect(await screen.findByRole('region', { name: 'Published configurations' })).toBeInTheDocument();
    expect(screen.getByText('New notification')).toBeInTheDocument();
    expect(screen.getByText('Configuration version saved. Existing records retain their previous settings.')).toBeInTheDocument();
  });

  it('prevents self-approval in the inbox and asks for an explicit decision reason', async () => {
    const policy: PublishedDefinition = { id: 1, kind: 'APPROVAL', key: 'INVOICE_ISSUE', version: 1, publishedAt: '2026-11-08T00:00:00Z', publishedById: 10, definition: { enabled: true, action: 'INVOICE_ISSUE', expiresAfterHours: 48, authority: 'OTHER_FIRM_ADMIN' } };
    const approval: Approval = { id: 'request-a', requesterId: 10, policyId: 1, command: { action: 'INVOICE_ISSUE', entityId: 1, expectedVersion: 1, confirmedTotal: '100' }, evidence: { documentNumber: 'Draft 1', total: '100', currency: 'INR' }, status: 'PENDING', expiresAt: '2099-01-01T00:00:00Z', consumedAt: null, createdAt: '2026-11-08T00:00:00Z', policy, decisions: [] };
    vi.mocked(api.listApprovals).mockResolvedValue([approval]); const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const view = render(tree(<ApprovalsPage />, client)); await screen.findByText('Issue invoice'); expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    access.userId = 20; view.rerender(tree(<ApprovalsPage />, client)); await userEvent.click(await screen.findByRole('button', { name: 'Approve' }));
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled(); await userEvent.type(screen.getByRole('textbox', { name: 'Decision reason' }), 'Independent review complete'); await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(api.decideApproval).toHaveBeenCalledWith('request-a', 'APPROVED', 'Independent review complete')); expect(api.performApprovedAction).not.toHaveBeenCalled();
  });
});
