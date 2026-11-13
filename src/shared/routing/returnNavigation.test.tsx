import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { NotificationProvider } from '@shared/ui/feedback';
import { useSaveAndReturn } from './returnNavigation';

function Editor({ refresh }: { refresh: () => Promise<unknown> }) {
  const { saved, cancel } = useSaveAndReturn('/companies');
  return <><button onClick={() => void saved('Company saved.', refresh)}>Save</button><button onClick={cancel}>Cancel</button></>;
}
function List() { const location = useLocation(); return <p>Records{location.search}</p>; }
function mount(from: unknown, refresh = vi.fn().mockResolvedValue(undefined)) {
  render(<NotificationProvider><MemoryRouter initialEntries={[{ pathname: '/companies/new', state: { from } }]}><Routes><Route path="/companies/new" element={<Editor refresh={refresh} />} /><Route path="/companies" element={<List />} /></Routes></MemoryRouter></NotificationProvider>);
  return refresh;
}

describe('save and return navigation', () => {
  it('returns to the filtered records and retains success after the editor unmounts', async () => {
    const refresh = mount('/companies?search=Buyer&page=2');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Records?search=Buyer&page=2')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Company saved.');
    expect(refresh).toHaveBeenCalledTimes(1);
  });
  it('separates refresh failure from a completed save', async () => {
    mount('/companies', vi.fn().mockRejectedValue(new Error('Read unavailable')));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Records')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Changes were saved, but the list could not refresh.'));
  });
  it.each(['https://example.invalid', '/items?search=private', '//example.invalid'])('rejects an unrelated return destination: %s', async (from) => {
    mount(from);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByText('Records')).toBeInTheDocument();
  });
});
