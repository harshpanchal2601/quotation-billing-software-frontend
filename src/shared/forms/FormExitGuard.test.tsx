import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { createMemoryRouter, Link, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { NotificationProvider } from '@shared/ui/feedback';
import { useSaveAndReturn } from '@shared/routing/returnNavigation';
import { FormExitGuard } from './FormExitGuard';

function Editor() {
  const [value, setValue] = useState('');
  const { saved, cancel, hasSaved } = useSaveAndReturn('/companies');
  return <FormExitGuard dirty={value !== ''} hasSaved={hasSaved} onCancel={cancel}>{(requestCancel) => <><label>Name<input value={value} onChange={(event) => setValue(event.target.value)} /></label><Link to="/items">Items</Link><button onClick={requestCancel}>Cancel editor</button><button onClick={() => void saved('Saved.', () => Promise.resolve())}>Save</button></>}</FormExitGuard>;
}
function mount() {
  const router = createMemoryRouter([{ path: '/companies/new', element: <Editor /> }, { path: '/items', element: <p>Item records</p> }, { path: '/companies', element: <p>Company records</p> }], { initialEntries: ['/companies/new'] });
  render(<NotificationProvider><RouterProvider router={router} /></NotificationProvider>);
}

describe('routed editor exit protection', () => {
  it('keeps edits when navigation is declined and leaves after explicit discard', async () => {
    mount(); await userEvent.type(screen.getByLabelText('Name'), 'Draft');
    await userEvent.click(screen.getByRole('link', { name: 'Items' }));
    expect(screen.getByRole('dialog', { name: 'Leave without saving?' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(screen.getByLabelText('Name')).toHaveValue('Draft');
    await userEvent.click(await screen.findByRole('link', { name: 'Items' }));
    await userEvent.click(screen.getByRole('button', { name: 'Discard and leave' }));
    expect(await screen.findByText('Item records')).toBeInTheDocument();
  });
  it('cancels a dirty editor with a single confirmation', async () => {
    mount(); await userEvent.type(screen.getByLabelText('Name'), 'Draft');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel editor' }));
    await userEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(await screen.findByText('Company records')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('removes a dialog blocker after discarding and permits the next sidebar navigation', async () => {
    function Workspace() {
      const [open, setOpen] = useState(true);
      const [value, setValue] = useState('');
      return <><Link to="/items">Items</Link>{open ? <FormExitGuard dirty={value !== ''} onCancel={() => setOpen(false)}>{(requestCancel) => <><label>Role description<input value={value} onChange={(event) => setValue(event.target.value)} /></label><button onClick={requestCancel}>Cancel role</button></>}</FormExitGuard> : <p>Role records</p>}</>;
    }
    const router = createMemoryRouter([{ path: '/roles', element: <Workspace /> }, { path: '/items', element: <p>Item records</p> }], { initialEntries: ['/roles'] });
    render(<RouterProvider router={router} />);
    await userEvent.type(screen.getByLabelText('Role description'), 'Unsaved');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel role' }));
    await userEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(await screen.findByText('Role records')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', { name: 'Items' }));
    expect(await screen.findByText('Item records')).toBeInTheDocument();
  });
  it('does not block navigation after a committed save', async () => {
    mount(); await userEvent.type(screen.getByLabelText('Name'), 'Draft');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getByText('Company records')).toBeInTheDocument());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Saved.');
  });
});
