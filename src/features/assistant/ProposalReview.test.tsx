import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationProvider } from '@shared/ui/feedback';
import { PERMISSIONS } from '@features/auth';
import { AssistantPage } from './AssistantPage';
import { AssistantSettingsPage } from './AssistantSettingsPage';
import { assistantApi, type Extraction, type History, type Proposal, type RecordLink, type Reply, type Status } from './assistant.api';
import { ProposalReview } from './ProposalReview';

const sessionAccess = vi.hoisted(() => ({ permissions: new Set<string>() }));
vi.mock('./assistant.api', () => ({ assistantApi: { confirm: vi.fn(), cancel: vi.fn(), settings: vi.fn(), saveSettings: vi.fn(), status: vi.fn(), chat: vi.fn(), propose: vi.fn(), history: vi.fn(), erase: vi.fn(), extract: vi.fn() } }));
vi.mock('@shared/tenancy/useFirmId', () => ({ useFirmId: () => 3 }));
vi.mock('@features/auth', async (original) => ({ ...(await original<typeof import('@features/auth')>()), useAuth: () => ({ user: { id: 6, accountType: 'FIRM_ADMIN' } }), useHasPermission: (...permissions: string[]) => permissions.some((permission) => sessionAccess.permissions.has(permission)) }));
const proposal: Proposal = { id: 'proposal-a', nonce: 'a'.repeat(64), expiresAt: new Date(Date.now() + 600000).toISOString(), command: { action: 'INVOICE_ISSUE', entityId: 11 }, before: { status: 'DRAFT', documentNumber: 'Draft 11', total: '123.45' }, after: { status: 'ISSUED' }, effects: 'The current draft will be issued after domain validation.' };
function renderReview(options: { proposal?: Proposal; onClose?: () => void; onExecuted?: () => void | Promise<unknown> } = {}) {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}><MemoryRouter><ProposalReview proposal={options.proposal ?? proposal} onClose={options.onClose ?? vi.fn()} onExecuted={options.onExecuted ?? vi.fn()} /></MemoryRouter></QueryClientProvider>);
}
beforeEach(() => {
  vi.resetAllMocks();
  sessionAccess.permissions = new Set(Object.values(PERMISSIONS));
  vi.mocked(assistantApi.status).mockResolvedValue(policyStatus);
  vi.mocked(assistantApi.history).mockResolvedValue({ conversations: [], page: 1, hasMore: false });
});
afterEach(() => vi.useRealTimers());
describe('assistant consequential action preview', () => {
  it('shows exact current and proposed fields without executing on preview', () => {
    renderReview(); expect(screen.getByText('Draft')).toBeInTheDocument(); expect(screen.getByText('Issued')).toBeInTheDocument(); expect(screen.getByText('123.45')).toBeInTheDocument(); expect(assistantApi.confirm).not.toHaveBeenCalled();
  });
  it('waits for server confirmation before showing success', async () => {
    let finish!: (value: { id: number; href: string; executionId: string; replayed: boolean }) => void;
    vi.mocked(assistantApi.confirm).mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    renderReview(); await userEvent.click(screen.getByRole('button', { name: 'Confirm and execute' }));
    expect(screen.queryByText(/server confirmed execution/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm and execute' })).toBeDisabled();
    finish({ id: 11, href: '/invoices/11', executionId: 'execution-a', replayed: false });
    expect(await screen.findByText(/server confirmed execution/i)).toBeInTheDocument();
    expect(assistantApi.confirm).toHaveBeenCalledTimes(1);
  });
  it('shows stale-version errors and keeps failed actions unconfirmed', async () => {
    vi.mocked(assistantApi.confirm).mockRejectedValue({ isAxiosError: true, response: { status: 409, data: { message: 'The target changed; review a new proposal' } } });
    renderReview(); await userEvent.click(screen.getByRole('button', { name: 'Confirm and execute' }));
    await waitFor(() => expect(screen.getByText('The target changed; review a new proposal')).toBeInTheDocument());
    expect(screen.queryByText(/server confirmed execution/i)).not.toBeInTheDocument();
  });
  it('uses readable action, field and cancellation labels without changing the reviewed values', () => {
    renderReview({ proposal: { ...proposal, command: { action: 'INVOICE_VOID', entityId: 11 }, before: { documentNumber: 'INV-11', status: 'ISSUED', discountAmount: '0.001' }, after: { status: 'VOID' } } });
    expect(screen.getByRole('dialog', { name: 'Review: Cancel invoice' })).toBeInTheDocument();
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
    expect(screen.getByText('Discount amount')).toBeInTheDocument();
    expect(screen.getByText('0.001')).toBeInTheDocument();
    expect(screen.queryByText('VOID')).not.toBeInTheDocument();
  });
  it('locks confirmation and cancellation together before a second click can send a request', async () => {
    let finish!: (value: { id: number; href: string; executionId: string; replayed: boolean }) => void;
    vi.mocked(assistantApi.confirm).mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    renderReview();
    const confirm = screen.getByRole('button', { name: 'Confirm and execute' });
    const cancel = screen.getByRole('button', { name: 'Cancel proposal' });
    act(() => { confirm.click(); cancel.click(); confirm.click(); });
    await waitFor(() => expect(assistantApi.confirm).toHaveBeenCalledTimes(1));
    expect(assistantApi.confirm).toHaveBeenCalledWith(proposal);
    expect(assistantApi.cancel).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Close preview' })).toBeDisabled();
    finish({ id: 11, href: '/invoices/11', executionId: 'execution-a', replayed: false });
    expect(await screen.findByText(/server confirmed execution/i)).toBeInTheDocument();
  });
  it('prevents execution while cancellation is awaiting its server response', async () => {
    let finish!: () => void;
    vi.mocked(assistantApi.cancel).mockImplementation(() => new Promise((resolve) => { finish = () => resolve({}); }));
    const onClose = vi.fn();
    renderReview({ onClose });
    const confirm = screen.getByRole('button', { name: 'Confirm and execute' });
    const cancel = screen.getByRole('button', { name: 'Cancel proposal' });
    act(() => { cancel.click(); confirm.click(); cancel.click(); });
    await waitFor(() => expect(assistantApi.cancel).toHaveBeenCalledTimes(1));
    expect(assistantApi.cancel).toHaveBeenCalledWith(proposal.id);
    expect(assistantApi.confirm).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    finish();
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: 'Confirm and execute' })).toBeDisabled();
  });
  it('expires an open preview without requiring a user action or rerender', () => {
    vi.useFakeTimers();
    renderReview({ proposal: { ...proposal, expiresAt: new Date(Date.now() + 1000).toISOString() } });
    expect(screen.getByRole('button', { name: 'Confirm and execute' })).toBeEnabled();
    act(() => { vi.advanceTimersByTime(1001); });
    expect(screen.getByRole('button', { name: 'Confirm and execute' })).toBeDisabled();
    expect(screen.getByText(/This proposal has expired/)).toBeInTheDocument();
    expect(assistantApi.confirm).not.toHaveBeenCalled();
  });
  it('rechecks expiry in the click handler if the browser delayed the expiry timer', () => {
    vi.useFakeTimers();
    renderReview({ proposal: { ...proposal, expiresAt: new Date(Date.now() + 1000).toISOString() } });
    vi.setSystemTime(Date.now() + 1001);
    act(() => { screen.getByRole('button', { name: 'Confirm and execute' }).click(); });
    expect(screen.getByRole('button', { name: 'Confirm and execute' })).toBeDisabled();
    expect(assistantApi.confirm).not.toHaveBeenCalled();
  });
  it('retains confirmed execution and a result link when refreshing the lists fails', async () => {
    vi.mocked(assistantApi.confirm).mockResolvedValue({ id: 11, href: '/invoices/11', executionId: 'execution-a', replayed: false });
    const onExecuted = vi.fn().mockRejectedValue(new Error('Refresh unavailable'));
    renderReview({ onExecuted });
    await userEvent.click(screen.getByRole('button', { name: 'Confirm and execute' }));
    expect(await screen.findByText(/server confirmed execution/i)).toBeInTheDocument();
    expect(await screen.findByText(/The action completed, but the lists could not be refreshed/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open result' })).toHaveAttribute('href', '/invoices/11');
    expect(screen.getByRole('button', { name: 'Confirm and execute' })).toBeDisabled();
    expect(screen.queryByText('Refresh unavailable')).not.toBeInTheDocument();
    expect(onExecuted).toHaveBeenCalledTimes(1);
  });

});


const policyStatus: Status = {
  localAllowed: true, llmAllowed: true, mode: 'LOCAL', fallback: 'LLM_DISABLED_BY_FIRM_ADMIN',
  connection: 'COMMERCIAL_INTEGRATION_REQUIRED', notice: null,
  credits: { used: '0', limit: '0', unit: 'REQUEST' }, todayRequests: 0, dailyResetTimezone: 'UTC',
  settings: { version: 2, llmEnabled: false, dailyLlmRequests: null, retainContentDays: null },
};
function renderSettings(status = policyStatus) {
  vi.mocked(assistantApi.settings).mockResolvedValue(status);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter><NotificationProvider><AssistantSettingsPage /></NotificationProvider></MemoryRouter></QueryClientProvider>);
}
describe('assistant policy settings', () => {
  it('shows a readable summary and opens an explicit policy editor', async () => {
    renderSettings();
    expect(await screen.findByRole('heading', { name: 'Firm policy' })).toBeInTheDocument();
    expect(screen.getByText('Off — conversation text is not stored')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect ChatGPT — not available yet' })).toBeDisabled();
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Edit policy' }));
    expect(screen.getByRole('dialog', { name: 'Edit assistant policy' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save policy' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(assistantApi.saveSettings).not.toHaveBeenCalled();
  });

  it('closes after a successful versioned save and shows success feedback', async () => {
    renderSettings();
    await userEvent.click(await screen.findByRole('button', { name: 'Edit policy' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'I approve these request limits and conversation storage settings.' }));
    vi.mocked(assistantApi.saveSettings).mockImplementation(async () => {
      vi.mocked(assistantApi.settings).mockResolvedValue({ ...policyStatus, settings: { ...policyStatus.settings, version: 3 } });
    });
    await userEvent.click(screen.getByRole('button', { name: 'Save policy' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Edit assistant policy' })).not.toBeInTheDocument());
    expect(await screen.findByText('Assistant policy saved.')).toBeInTheDocument();
    expect(assistantApi.saveSettings).toHaveBeenCalledWith(policyStatus.settings);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('keeps the policy editor open with entered limits when saving fails', async () => {
    vi.mocked(assistantApi.saveSettings).mockRejectedValue(new Error('Policy save failed'));
    renderSettings();
    await userEvent.click(await screen.findByRole('button', { name: 'Edit policy' }));
    await userEvent.type(screen.getByRole('spinbutton', { name: 'Daily request limit' }), '25');
    await userEvent.click(screen.getByRole('checkbox', { name: 'I approve these request limits and conversation storage settings.' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save policy' }));
    await waitFor(() => expect(assistantApi.saveSettings).toHaveBeenCalled());
    expect(screen.getByRole('dialog', { name: 'Edit assistant policy' })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Daily request limit' })).toHaveValue(25);
    expect(screen.queryByText('Assistant policy saved.')).not.toBeInTheDocument();
  });

  it('requires confirmation before clearing previously retained conversation text', async () => {
    renderSettings({ ...policyStatus, settings: { ...policyStatus.settings, retainContentDays: 7 } });
    await userEvent.click(await screen.findByRole('button', { name: 'Edit policy' }));
    await userEvent.clear(screen.getByRole('spinbutton', { name: 'Store conversation text for (days)' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'I approve these request limits and conversation storage settings.' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save policy' }));
    const confirmation = screen.getByRole('dialog', { name: 'Delete stored conversation content?' });
    expect(confirmation).toBeInTheDocument();
    expect(assistantApi.saveSettings).not.toHaveBeenCalled();
    await userEvent.click(within(confirmation).getByRole('button', { name: 'Cancel' }));
    expect(await screen.findByRole('dialog', { name: 'Edit assistant policy' })).toBeInTheDocument();
  });
});

function deferred<Value>() {
  let resolve!: (value: Value) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<Value>((finish, fail) => { resolve = finish; reject = fail; });
  return { promise, resolve, reject };
}
function replyFor(input: Parameters<typeof assistantApi.chat>[0], resource: Reply['plan']['resource'], records: RecordLink[], options: { conversationId?: string; mode?: Reply['mode']; page?: number; total?: number } = {}): Reply {
  return { requestId: input.requestId, conversationId: options.conversationId ?? 'conversation-a', mode: options.mode ?? 'LOCAL', fallback: null, notice: null, toolStatus: 'COMPLETED', plan: { tool: 'SEARCH', resource, query: '', page: options.page ?? 1 }, result: { records, pagination: { page: options.page ?? 1, total: options.total ?? records.length } } };
}
function EditorState() { const location = useLocation(); return <output aria-label="Normal editor input">{JSON.stringify(location.state)}</output>; }
function renderAssistant(route = '/assistant') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[route]}><NotificationProvider><Routes><Route path="/assistant" element={<AssistantPage />} /><Route path="/invoices/new" element={<EditorState />} /><Route path="/quotations/new" element={<EditorState />} /></Routes></NotificationProvider></MemoryRouter></QueryClientProvider>);
}
const exactCustomer: RecordLink = { id: 42, label: 'QA Supplies India', href: '/companies/42' };

describe('main assistant workspace', () => {
  it('retains the typed question while pending and retries the original request identity after a lost response', async () => {
    const pending = deferred<Reply>();
    vi.mocked(assistantApi.chat).mockReturnValueOnce(pending.promise);
    renderAssistant();
    const ask = await screen.findByRole('button', { name: 'Ask assistant' });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Find customers' })).toBeEnabled());
    const question = screen.getByRole('textbox', { name: 'Your question' });
    await userEvent.type(question, 'Find customers named QA');
    await userEvent.click(ask);
    await waitFor(() => expect(assistantApi.chat).toHaveBeenCalledTimes(1));
    expect(question).toBeDisabled();
    expect(question).toHaveValue('Find customers named QA');
    expect(screen.getByRole('combobox', { name: 'Assistant mode' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: 'New conversation' })).toBeDisabled();
    const original = vi.mocked(assistantApi.chat).mock.calls[0]![0];
    await act(async () => pending.reject(new Error('Response lost')));
    expect(await screen.findByRole('button', { name: 'Retry request' })).toBeEnabled();
    expect(question).toHaveValue('Find customers named QA');
    vi.mocked(assistantApi.chat).mockResolvedValueOnce(replyFor(original, 'CUSTOMERS', [exactCustomer]));
    await userEvent.click(screen.getByRole('button', { name: 'Retry request' }));
    expect(await screen.findByRole('link', { name: exactCustomer.label })).toBeInTheDocument();
    expect(vi.mocked(assistantApi.chat).mock.calls[1]![0]).toEqual(original);
    expect(screen.getByRole('heading', { name: 'Find customers named QA' })).toBeInTheDocument();
    expect(question).toHaveValue('');
    expect(question).toBeEnabled();
    expect(assistantApi.history).not.toHaveBeenCalled();
  });

  it('selects exact customer and item names, gates draft types, and clears workspace selections only after reset confirmation', async () => {
    sessionAccess.permissions = new Set([PERMISSIONS.ASSISTANT_LOCAL, PERMISSIONS.COMPANIES_VIEW, PERMISSIONS.ITEMS_VIEW, PERMISSIONS.QUOTATIONS_CREATE, PERMISSIONS.QUOTATIONS_VIEW, PERMISSIONS.CRM_VIEW, PERMISSIONS.INVOICES_VIEW]);
    vi.mocked(assistantApi.chat).mockImplementation(async (input) => {
      if (input.message === 'Find customers') return replyFor(input, 'CUSTOMERS', [{ id: 41, label: 'QA Supplies', href: '/companies/41' }, exactCustomer]);
      if (input.message === 'Find items') return replyFor(input, 'ITEMS', [{ id: 8, label: 'Bracket 304', href: '/items/8' }]);
      return { ...replyFor(input, undefined, []), plan: { tool: 'DRAFT' }, result: { kind: 'QUOTATION', unsaved: true, companyId: 42, customer: exactCustomer.label, href: '/quotations/new', text: '', subject: '', lines: [] } };
    });
    renderAssistant();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Find customers' })).toBeEnabled());
    await userEvent.click(screen.getByRole('button', { name: 'Find customers' }));
    const row = await screen.findByRole('row', { name: /QA Supplies India/ });
    await userEvent.click(within(row).getByRole('button', { name: 'Use customer' }));
    const draft = within(screen.getByRole('heading', { name: 'Prepare a draft' }).closest('section')!);
    expect(draft.getByRole('link', { name: exactCustomer.label })).toHaveAttribute('href', exactCustomer.href);
    expect(draft.getByRole('button', { name: 'Quotation' })).toBeEnabled();
    expect(draft.queryByRole('button', { name: 'Invoice' })).not.toBeInTheDocument();
    expect(draft.queryByRole('button', { name: 'Follow-up' })).not.toBeInTheDocument();
    expect(draft.queryByRole('button', { name: 'Email text' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Outstanding invoices' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Find items' }));
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Include Bracket 304 in draft' }));
    expect(draft.getByText('Bracket 304')).toBeInTheDocument();
    expect(draft.getByText('1 of 25')).toBeInTheDocument();
    await userEvent.click(draft.getByRole('button', { name: 'Quotation' }));
    await waitFor(() => expect(assistantApi.chat).toHaveBeenCalledWith(expect.objectContaining({ plan: { tool: 'DRAFT', kind: 'QUOTATION', companyId: 42, itemIds: [8] } })));
    await waitFor(() => expect(screen.getByRole('button', { name: 'New conversation' })).toBeEnabled());
    await userEvent.click(screen.getByRole('button', { name: 'New conversation' }));
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Start a new conversation?' })).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(draft.getByRole('link', { name: exactCustomer.label })).toBeInTheDocument();
    expect(draft.getByText('Bracket 304')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'New conversation' }));
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Start a new conversation?' })).getByRole('button', { name: 'Start new conversation' }));
    expect(await screen.findByText('No customer selected')).toBeInTheDocument();
    expect(draft.queryByText('Bracket 304')).not.toBeInTheDocument();
    expect(draft.getByText('0 of 25')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Find customers' })).not.toBeInTheDocument();
    expect(assistantApi.erase).not.toHaveBeenCalled();
    expect(assistantApi.confirm).not.toHaveBeenCalled();
  });

  it('requests server sorting and later pages while replacing the original search result', async () => {
    vi.mocked(assistantApi.chat).mockImplementation(async (input) => {
      const plan = input.plan as Reply['plan'] | undefined;
      const page = plan?.page ?? 1;
      const label = page === 2 ? 'Customer page two' : plan?.sortOrder === 'asc' ? 'Customer ascending' : plan?.sortBy ? 'Customer sorted' : 'Customer original';
      return { ...replyFor(input, 'CUSTOMERS', [{ id: page === 2 ? 21 : 1, label, href: '/companies/1' }], { page, total: 41 }), plan: { tool: 'SEARCH', resource: 'CUSTOMERS', query: '', page, ...(plan?.sortBy ? { sortBy: plan.sortBy, sortOrder: plan.sortOrder } : {}) } };
    });
    renderAssistant();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Find customers' })).toBeEnabled());
    await userEvent.click(screen.getByRole('button', { name: 'Find customers' }));
    await screen.findByRole('link', { name: 'Customer original' });
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'id');
    expect(await screen.findByRole('link', { name: 'Customer sorted' })).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Sort order' }), 'asc');
    expect(await screen.findByRole('link', { name: 'Customer ascending' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Go to next page' }));
    expect(await screen.findByRole('link', { name: 'Customer page two' })).toBeInTheDocument();
    const requests = vi.mocked(assistantApi.chat).mock.calls.map(([input]) => input);
    expect(requests).toHaveLength(4);
    expect(new Set(requests.map((input) => input.requestId)).size).toBe(4);
    expect(requests[3]).toEqual(expect.objectContaining({ conversationId: 'conversation-a', message: 'Find customers', mode: 'LOCAL', plan: expect.objectContaining({ tool: 'SEARCH', resource: 'CUSTOMERS', page: 2, sortBy: 'id', sortOrder: 'asc' }) }));
    expect(screen.getAllByRole('heading', { name: 'Find customers' })).toHaveLength(1);
    expect(screen.getAllByRole('table', { name: 'Assistant search results' })).toHaveLength(1);
    expect(screen.queryByRole('link', { name: 'Customer original' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Customer ascending' })).not.toBeInTheDocument();
  });

  it('uses the clicked reply conversation and mode for an action preview instead of the newest reply', async () => {
    vi.mocked(assistantApi.chat).mockImplementation(async (input) => input.message === 'Find customers' ? replyFor(input, 'CUSTOMERS', [exactCustomer], { conversationId: 'conversation-new', mode: 'LLM' }) : replyFor(input, 'INVOICES', [{ id: 11, label: 'Draft 11', href: '/invoices/11', status: 'DRAFT', version: 2, currency: 'INR', total: '9007199254740993.01' }], { conversationId: 'conversation-original', mode: 'LOCAL' }));
    vi.mocked(assistantApi.propose).mockResolvedValue(proposal);
    renderAssistant();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Find customers' })).toBeEnabled());
    await userEvent.type(screen.getByRole('textbox', { name: 'Your question' }), 'Find draft invoices');
    await userEvent.click(screen.getByRole('button', { name: 'Ask assistant' }));
    await screen.findByRole('button', { name: 'Review issue invoice' });
    await userEvent.click(screen.getByRole('button', { name: 'Find customers' }));
    await screen.findByRole('link', { name: exactCustomer.label });
    await userEvent.click(screen.getByRole('button', { name: 'Review issue invoice' }));
    expect(await screen.findByRole('dialog', { name: 'Review: Issue invoice' })).toBeInTheDocument();
    expect(assistantApi.propose).toHaveBeenCalledWith({ conversationId: 'conversation-original', mode: 'LOCAL', command: { action: 'INVOICE_ISSUE', entityId: 11, expectedVersion: 2, confirmedTotal: '9007199254740993.01' } });
    expect(assistantApi.confirm).not.toHaveBeenCalled();
  });

  it('requires history erase confirmation and keeps cancelled action history readable', async () => {
    const history: History = { page: 1, hasMore: false, conversations: [{ id: 'conversation-a', createdAt: '2026-11-10T12:00:00.000Z', messages: [{ id: 'message-a', mode: 'LOCAL', tool: 'SEARCH', status: 'COMPLETED', errorCode: null, createdAt: '2026-11-10T12:01:00.000Z' }], proposals: [{ id: 'cancelled-proposal', status: 'CANCELLED', expiresAt: '2026-11-10T12:05:00.000Z', command: { action: 'INVOICE_VOID' }, execution: null }] }] };
    vi.mocked(assistantApi.history).mockResolvedValue(history);
    const erased = deferred<Awaited<ReturnType<typeof assistantApi.erase>>>();
    vi.mocked(assistantApi.erase).mockReturnValue(erased.promise);
    renderAssistant('/assistant?tab=history');
    await screen.findByRole('button', { name: 'View history' });
    expect(assistantApi.history).toHaveBeenCalledWith(1, { sortBy: 'createdAt', sortOrder: 'desc' });
    await userEvent.click(screen.getByRole('button', { name: 'View history' }));
    const historyDialog = within(screen.getByRole('dialog', { name: 'Conversation history' }));
    expect(historyDialog.getByText('Cancelled')).toBeInTheDocument();
    expect(historyDialog.getByText('Cancel invoice')).toBeInTheDocument();
    expect(historyDialog.getByText('No completed action')).toBeInTheDocument();
    await userEvent.click(historyDialog.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'Clear content & close' }));
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Clear conversation content?' })).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(assistantApi.erase).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'View history' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Clear content & close' }));
    const confirm = within(screen.getByRole('dialog', { name: 'Clear conversation content?' })).getByRole('button', { name: 'Clear content & close' });
    act(() => { confirm.click(); confirm.click(); });
    await waitFor(() => expect(assistantApi.erase).toHaveBeenCalledTimes(1));
    expect(vi.mocked(assistantApi.erase).mock.calls[0]![0]).toBe('conversation-a');
    expect(confirm).toBeDisabled();
    vi.mocked(assistantApi.history).mockResolvedValue({ conversations: [], page: 1, hasMore: false });
    await act(async () => erased.resolve({} as Awaited<ReturnType<typeof assistantApi.erase>>));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Conversation content cleared and conversation closed.')).toBeInTheDocument();
    expect(await screen.findByText('Start a conversation in Ask & search to see your request history.')).toBeInTheDocument();
  });

  it('extracts read-only candidates once and transfers only reviewed lines with exact amounts to the normal editor', async () => {
    vi.mocked(assistantApi.chat).mockImplementation(async (input) => replyFor(input, 'CUSTOMERS', [exactCustomer]));
    const extracted = deferred<Extraction>();
    vi.mocked(assistantApi.extract).mockReturnValue(extracted.promise);
    renderAssistant();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Find customers' })).toBeEnabled());
    await userEvent.click(screen.getByRole('button', { name: 'Find customers' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Use customer' }));
    await userEvent.click(screen.getByRole('tab', { name: 'Review document text' }));
    const sourceText = 'Steel bracket | 0.003 | 900719925474099.001\nUnselected part | 2 | 25.50';
    const text = screen.getByRole('textbox', { name: 'Copied document text' });
    fireEvent.change(text, { target: { value: sourceText } });
    const extract = screen.getByRole('button', { name: 'Find item lines' });
    act(() => { extract.click(); extract.click(); });
    await waitFor(() => expect(assistantApi.extract).toHaveBeenCalledTimes(1));
    expect(assistantApi.extract).toHaveBeenCalledWith('PDF_TEXT', sourceText);
    expect(text).toHaveValue(sourceText);
    expect(text).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'Text copied from' })).toHaveAttribute('aria-disabled', 'true');
    await act(async () => extracted.resolve({ untrusted: true, imported: false, truncated: false, message: 'Review each suggested line.', candidates: [{ sourceLine: 1, itemName: 'Steel bracket', quantity: '0.003', unitRate: '900719925474099.001', itemId: null, verified: false }, { sourceLine: 2, itemName: 'Unselected part', quantity: '2', unitRate: '25.50', itemId: null, verified: false }] }));
    expect(await screen.findByRole('button', { name: 'Review invoice' })).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Include Steel bracket' }));
    expect(screen.getByRole('checkbox', { name: 'Include Unselected part' })).not.toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: 'Review invoice' }));
    const transfer = JSON.parse((await screen.findByLabelText('Normal editor input')).textContent!);
    expect(transfer).toEqual({ source: 'assistant', firmId: 3, actorId: 6, kind: 'INVOICE', companyId: 42, lines: [{ itemId: null, itemName: 'Steel bracket', quantity: '0.003', unitRate: '900719925474099.001', taxRate: '0', measurementUnit: 'NOS', supplyType: 'GOODS', discountType: 'NONE', discountValue: '0' }] });
    expect(assistantApi.chat).toHaveBeenCalledTimes(1);
    expect(assistantApi.propose).not.toHaveBeenCalled();
    expect(assistantApi.confirm).not.toHaveBeenCalled();
  });
});
