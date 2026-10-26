import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BusinessPolicyPanel } from './BusinessPolicyPanel';
import type { BusinessPolicyConfiguration } from '../api/business-policy.api';

const api = vi.hoisted(() => ({ get: vi.fn(), update: vi.fn() }));
vi.mock('../api/business-policy.api', () => ({ businessPolicyQueryKey: ['settings', 'business-policy'], getBusinessPolicyRequest: api.get, updateBusinessPolicyRequest: api.update }));
const configuration: BusinessPolicyConfiguration = { version: 3, policy: { schemaVersion: 1, currency: 'INR', rounding: 'HALF_UP', grandTotal: 'WHOLE_UNIT', tax: { id: 'none', version: 1 }, inAppNotifications: true } };
function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><BusinessPolicyPanel /></QueryClientProvider>);
}
beforeEach(() => { vi.resetAllMocks(); api.get.mockResolvedValue(configuration); });
afterEach(cleanup);

describe('financial policy settings', () => {
  it('loads on demand and keeps the legacy quotation scope explicit', async () => {
    show();
    expect(api.get).not.toHaveBeenCalled();
    expect(screen.getByText(/Quotations keep their existing calculation rules/)).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Configure financial policies' }));
    expect(await screen.findByText(/Policy version 3/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Save financial policies' })).toBeDisabled();
  });

  it('sends the displayed version and updates notification preferences', async () => {
    api.update.mockImplementation(async (input) => ({ version: 4, policy: input.policy }));
    show(); await userEvent.click(screen.getByRole('button', { name: 'Configure financial policies' }));
    await userEvent.click(await screen.findByRole('checkbox', { name: 'In-app notifications' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save financial policies' }));
    await waitFor(() => expect(api.update).toHaveBeenCalledWith({ expectedVersion: 3, policy: { ...configuration.policy, inAppNotifications: false } }, expect.anything()));
    expect(await screen.findByText(/Policy version 4/)).toBeVisible();
  });

  it('exposes a reload after a stale-version conflict', async () => {
    api.update.mockRejectedValue({ isAxiosError: true, response: { status: 409, data: { message: 'Business policy changed; reload before saving' } } });
    show(); await userEvent.click(screen.getByRole('button', { name: 'Configure financial policies' }));
    await userEvent.click(await screen.findByRole('checkbox', { name: 'In-app notifications' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save financial policies' }));
    expect(await screen.findByRole('button', { name: 'Reload policy' })).toBeVisible();
    api.get.mockResolvedValue({ ...configuration, version: 4 });
    await userEvent.click(screen.getByRole('button', { name: 'Reload policy' }));
    expect(await screen.findByText(/Policy version 4/)).toBeVisible();
  });

  it('supports recoverable loading failures', async () => {
    api.get.mockRejectedValueOnce(new Error('offline'));
    show(); await userEvent.click(screen.getByRole('button', { name: 'Configure financial policies' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    expect(await screen.findByText(/Policy version 3/)).toBeVisible();
  });

  it('keeps unsaved preferences when the panel is closed and reopened', async () => {
    show(); await userEvent.click(screen.getByRole('button', { name: 'Configure financial policies' }));
    await userEvent.click(await screen.findByRole('checkbox', { name: 'In-app notifications' }));
    await userEvent.click(screen.getByRole('button', { name: 'Close financial policies' }));
    await userEvent.click(screen.getByRole('button', { name: 'Configure financial policies' }));
    expect(screen.getByRole('checkbox', { name: 'In-app notifications' })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Save financial policies' })).toBeEnabled();
    expect(api.get).toHaveBeenCalledTimes(1);
  });
});
