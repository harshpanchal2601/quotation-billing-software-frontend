import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { assistantApi, type Proposal } from './assistant.api';
import { ProposalReview } from './ProposalReview';

vi.mock('./assistant.api', () => ({ assistantApi: { confirm: vi.fn(), cancel: vi.fn() } }));
const proposal: Proposal = { id: 'proposal-a', nonce: 'a'.repeat(64), expiresAt: new Date(Date.now() + 600000).toISOString(), command: { action: 'INVOICE_ISSUE', entityId: 11 }, before: { status: 'DRAFT', documentNumber: 'Draft 11', total: '123.45' }, after: { status: 'ISSUED' }, effects: 'The current draft will be issued after domain validation.' };
function renderReview() { return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}><MemoryRouter><ProposalReview proposal={proposal} onClose={vi.fn()} onExecuted={vi.fn()} /></MemoryRouter></QueryClientProvider>); }
beforeEach(() => vi.resetAllMocks());
describe('assistant consequential action preview', () => {
  it('shows exact current and proposed fields without executing on preview', () => {
    renderReview(); expect(screen.getByText('DRAFT')).toBeInTheDocument(); expect(screen.getByText('ISSUED')).toBeInTheDocument(); expect(screen.getByText('123.45')).toBeInTheDocument(); expect(assistantApi.confirm).not.toHaveBeenCalled();
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
});
