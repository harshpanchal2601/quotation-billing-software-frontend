import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BillingSchedulesPage } from './BillingSchedulesPage';
import * as api from './billing-schedules.api';

vi.mock('@shared/tenancy/useFirmId', () => ({ useFirmId: () => 1 }));
vi.mock('./billing-schedules.api');
const preview: api.SchedulePreview = { currency: 'INR', grandTotal: '100.00', taxableAmount: '100.00', taxAmount: '0.00', lines: [] };
const schedule: api.Schedule & { runs: api.ScheduleRun[] } = { id: 1, name: 'Monthly service', status: 'PAUSED', version: 1, nextPeriod: '2026-11-03', versions: [{ version: 1, createdById: 1, approvedById: null, approvedAt: null, config: { sourceDraftId: 11, startDate: '2026-11-03', endDate: null, intervalMonths: 1, dueDays: 30 }, preview }], runs: [] };
function wrap() { const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } }); return render(<QueryClientProvider client={client}><MemoryRouter><BillingSchedulesPage /></MemoryRouter></QueryClientProvider>); }
beforeEach(() => { vi.clearAllMocks(); vi.mocked(api.listSchedules).mockResolvedValue({ schedules: [schedule], pagination: { totalPages: 1 } }); vi.mocked(api.getSchedule).mockResolvedValue(schedule); vi.mocked(api.previewSchedule).mockResolvedValue({ preview, previewToken: 'a'.repeat(64) }); });
describe('recurring draft approval', () => {
  it('requires a visible preview and explicit approval before activating a paused version', async () => {
    wrap(); await userEvent.click(await screen.findByRole('button', { name: 'Monthly service' }));
    expect(await screen.findByRole('button', { name: 'Review approval preview' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve this schedule version' })).not.toBeInTheDocument(); expect(api.approveSchedule).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Review approval preview' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Approve this schedule version' }));
    await waitFor(() => expect(api.approveSchedule).toHaveBeenCalledWith(1, 1, 'a'.repeat(64)));
  });
  it('preserves server conflicts without silently approving a changed schedule', async () => {
    vi.mocked(api.approveSchedule).mockRejectedValue({ isAxiosError: true, response: { status: 409, data: { success: false, message: 'Schedule preview changed; review it again' } } });
    wrap(); await userEvent.click(await screen.findByRole('button', { name: 'Monthly service' })); await userEvent.click(await screen.findByRole('button', { name: 'Review approval preview' })); await userEvent.click(await screen.findByRole('button', { name: 'Approve this schedule version' }));
    expect(await screen.findByText('Schedule preview changed; review it again')).toBeInTheDocument(); expect(api.approveSchedule).toHaveBeenCalledTimes(1);
  });
});
