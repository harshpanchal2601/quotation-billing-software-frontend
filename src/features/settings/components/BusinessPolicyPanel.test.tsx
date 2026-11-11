import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationProvider } from '@shared/ui/feedback';
import { BusinessPolicyPanel } from './BusinessPolicyPanel';
import type { BusinessPolicyConfiguration } from '../api/business-policy.api';

const api = vi.hoisted(() => ({ get: vi.fn(), update: vi.fn() }));
vi.mock('../api/business-policy.api', () => ({ businessPolicyQueryKey: ['settings', 'business-policy'], getBusinessPolicyRequest: api.get, updateBusinessPolicyRequest: api.update }));
const configuration: BusinessPolicyConfiguration = { version: 3, policy: { schemaVersion: 1, currency: 'INR', rounding: 'HALF_UP', grandTotal: 'WHOLE_UNIT', tax: { id: 'none', version: 1 }, inAppNotifications: true } };
function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><NotificationProvider><BusinessPolicyPanel /></NotificationProvider></QueryClientProvider>);
  return client;
}
async function edit() {
  await userEvent.click(screen.getByRole('button', { name: 'Configure financial policies' }));
  await userEvent.click(await screen.findByRole('button', { name: 'Edit financial policies' }));
  return within(screen.getByRole('dialog', { name: 'Edit financial policies' }));
}
async function save() {
  await userEvent.click(screen.getByRole('button', { name: 'Save financial policies' }));
  await userEvent.click(screen.getByRole('button', { name: 'Confirm and save' }));
}
beforeEach(() => { vi.resetAllMocks(); api.get.mockResolvedValue(configuration); });
afterEach(cleanup);

describe('financial policy settings', () => {
  it('loads on demand into a summary and keeps the quotation scope explicit', async () => {
    show();
    expect(api.get).not.toHaveBeenCalled();
    expect(screen.getByText(/Quotations keep their existing calculation rules/)).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Configure financial policies' }));
    expect(await screen.findByText(/Policy version 3/)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Save financial policies' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Edit financial policies' }));
    expect(screen.getByRole('button', { name: 'Save financial policies' })).toBeDisabled();
  });

  it('confirms the captured version, closes the editor and shows the saved summary', async () => {
    api.update.mockImplementation(async (input) => {
      const updated = { version: 4, policy: input.policy };
      api.get.mockResolvedValue(updated);
      return updated;
    });
    show(); const form = await edit();
    await userEvent.click(form.getByRole('checkbox', { name: 'In-app notifications' }));
    await save();
    await waitFor(() => expect(api.update).toHaveBeenCalledWith({ expectedVersion: 3, policy: { ...configuration.policy, inAppNotifications: false } }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText(/Policy version 4/)).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('Financial policies saved.');
  });

  it('retains a stale-version edit until explicit discard and refreshes before reopening', async () => {
    api.update.mockRejectedValue({ isAxiosError: true, response: { status: 409, data: { message: 'Business policy changed; reload before saving' } } });
    show(); const form = await edit();
    await userEvent.click(form.getByRole('checkbox', { name: 'In-app notifications' }));
    await save();
    expect(await screen.findAllByText('Business policy changed; reload before saving')).not.toHaveLength(0);
    expect(await form.findByRole('checkbox', { name: 'In-app notifications' })).not.toBeChecked();
    api.get.mockResolvedValue({ ...configuration, version: 4 });
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await userEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByText(/Policy version 4/)).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Edit financial policies' }));
    expect(within(screen.getByRole('dialog')).getByRole('checkbox', { name: 'In-app notifications' })).toBeChecked();
    expect(api.update).toHaveBeenCalledTimes(1);
  });

  it('supports recoverable loading failures', async () => {
    api.get.mockRejectedValueOnce(new Error('offline'));
    show(); await userEvent.click(screen.getByRole('button', { name: 'Configure financial policies' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    expect(await screen.findByText(/Policy version 3/)).toBeVisible();
  });

  it('keeps unsaved preferences on background refresh and when discard is declined', async () => {
    const client = show(); const form = await edit();
    await userEvent.click(form.getByRole('checkbox', { name: 'In-app notifications' }));
    client.setQueryData(['settings', 'business-policy'], { ...configuration, version: 4 });
    expect(await form.findByRole('checkbox', { name: 'In-app notifications' })).not.toBeChecked();
    expect(form.getByText(/Policy version 3/)).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await userEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(await form.findByRole('checkbox', { name: 'In-app notifications' })).not.toBeChecked();
    expect(await screen.findByRole('button', { name: 'Save financial policies' })).toBeEnabled();
    expect(api.update).not.toHaveBeenCalled();
  });
});
