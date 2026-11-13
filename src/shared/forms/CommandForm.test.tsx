import { NotificationProvider } from '@shared/ui/feedback';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TextField } from '@mui/material';
import { describe, expect, it, vi } from 'vitest';
import { CommandForm } from './CommandForm';

describe('transaction form retry identity', () => {
  it('retains approved command inputs and retry identity without reporting a completed business action', async () => {
    const submit = vi.fn<(data: FormData, key: string) => Promise<unknown>>().mockRejectedValueOnce({ isAxiosError: true, response: { status: 409, data: { message: 'Approval requested. Wait for independent review.', errors: { code: 'APPROVAL_REQUESTED' } } } }).mockResolvedValue({});
    const saved = vi.fn();
    render(<QueryClientProvider client={new QueryClient()}><NotificationProvider><CommandForm dialog title="Adjust stock" submit={submit} saved={saved}><TextField name="quantity" label="Quantity" defaultValue="0.003" /></CommandForm></NotificationProvider></QueryClientProvider>);
    await userEvent.click(screen.getByRole('button', { name: 'Adjust stock' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(within(screen.getByRole('dialog')).getByRole('alert')).toHaveTextContent('Approval requested.'));
    expect(saved).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: 'Quantity' })).toHaveValue('0.003');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled());
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(submit.mock.calls[1]![1]).toBe(submit.mock.calls[0]![1]);
    expect(saved).toHaveBeenCalledTimes(1);
  });
  it('removes its error on close so the next operation can show success', async () => {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    render(<QueryClientProvider client={client}><NotificationProvider>
      <CommandForm dialog title="Create order" submit={vi.fn().mockRejectedValue({ isAxiosError: true, response: { status: 409, data: { message: 'Quotation already has an order' } } })} saved={() => undefined}><span>Review the selected quotation.</span></CommandForm>
      <CommandForm dialog title="Create component list" submit={vi.fn().mockResolvedValue({})} saved={() => undefined} successMessage="Component list saved."><span>Review the selected components.</span></CommandForm>
    </NotificationProvider></QueryClientProvider>);
    await userEvent.click(screen.getByRole('button', { name: 'Create order' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save' }));
    expect(await screen.findAllByText('Quotation already has an order')).toHaveLength(2);
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByText('Quotation already has an order')).not.toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'Create component list' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Component list saved.');
    client.clear();
  });
  it('asks before discarding edits and returns to the action without submitting', async () => {
    const submit = vi.fn().mockResolvedValue({});
    render(<QueryClientProvider client={new QueryClient()}><NotificationProvider><CommandForm dialog title="Receive goods" submit={submit} saved={() => undefined}><TextField name="quantity" label="Quantity" defaultValue="1.000" /></CommandForm></NotificationProvider></QueryClientProvider>);
    await userEvent.click(screen.getByRole('button', { name: 'Receive goods' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Quantity' }), { target: { value: '2.000' } });
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Discard unsaved changes?' })).getByRole('button', { name: 'Keep editing' }));
    expect(await screen.findByRole('textbox', { name: 'Quantity' })).toHaveValue('2.000');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await userEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(submit).not.toHaveBeenCalled();
  });
  it('confirms a consequence, submits once and closes even when refreshing fails', async () => {
    let finish!: () => void;
    const submit = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    const saved = vi.fn().mockRejectedValue(new Error('Read unavailable'));
    render(<QueryClientProvider client={new QueryClient()}><NotificationProvider><CommandForm dialog title="Post receipt" submit={submit} saved={saved} confirmation={{ title: 'Receive these goods?', description: 'This changes stock.' }}><TextField name="quantity" label="Quantity" defaultValue="0.003" /></CommandForm></NotificationProvider></QueryClientProvider>);
    const trigger = screen.getByRole('button', { name: 'Post receipt' });
    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(submit).not.toHaveBeenCalled();
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Receive these goods?' })).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
    expect(trigger).toBeDisabled();
    finish();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('status')).toHaveTextContent('Changes saved.');
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Changes were saved, but the list could not refresh.'));
    expect(submit).toHaveBeenCalledTimes(1);
  });
  it('retains exact fields and identity across lost responses, including a successful replay, and changes identity for edits', async () => {
    const submit = vi.fn<(data: FormData, key: string) => Promise<unknown>>().mockRejectedValueOnce(new Error('Response lost')).mockResolvedValue({});
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } });
    render(<QueryClientProvider client={client}><NotificationProvider><CommandForm title="Receive goods" submit={submit} saved={() => undefined}><TextField name="quantity" label="Quantity" defaultValue="0.003" /></CommandForm></NotificationProvider></QueryClientProvider>);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled());
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Changes saved.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(submit.mock.calls[0]![0].get('quantity')).toBe('0.003'); expect(submit.mock.calls[1]![1]).toBe(submit.mock.calls[0]![1]);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled());
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(3)); expect(submit.mock.calls[2]![1]).toBe(submit.mock.calls[0]![1]);
    fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '0.004' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled());
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(4)); expect(submit.mock.calls[3]![1]).not.toBe(submit.mock.calls[0]![1]); expect(submit.mock.calls[3]![0].get('quantity')).toBe('0.004');
    client.clear();
  });
});
