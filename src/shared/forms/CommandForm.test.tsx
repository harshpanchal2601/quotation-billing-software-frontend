import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TextField } from '@mui/material';
import { describe, expect, it, vi } from 'vitest';
import { CommandForm } from './CommandForm';

describe('transaction form retry identity', () => {
  it('retains exact fields and identity across lost responses, including a successful replay, and changes identity for edits', async () => {
    const submit = vi.fn<(data: FormData, key: string) => Promise<unknown>>().mockRejectedValueOnce(new Error('Response lost')).mockResolvedValue({});
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } });
    render(<QueryClientProvider client={client}><CommandForm title="Receive goods" submit={submit} saved={() => undefined}><TextField name="quantity" label="Quantity" defaultValue="0.003" /></CommandForm></QueryClientProvider>);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled());
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(2));
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
