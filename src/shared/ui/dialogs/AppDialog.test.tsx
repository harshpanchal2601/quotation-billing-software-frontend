import Button from '@mui/material/Button';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AppDialog } from './AppDialog';

describe('AppDialog', () => {
  it('renders title, content, actions and ARIA associations', () => {
    render(
      <AppDialog open title="Dialog title" description="Dialog description" actions={<Button>Done</Button>}>
        Dialog body
      </AppDialog>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Dialog title' });

    expect(dialog).toHaveAccessibleDescription('Dialog description');
    expect(screen.getByText('Dialog body')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
  });

  it('calls close from the accessible close button', async () => {
    const onClose = vi.fn();

    render(<AppDialog open title="Dialog title" onClose={onClose} showCloseButton />);

    await userEvent.click(screen.getByRole('button', { name: 'Close dialog' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('forwards safe Dialog props', () => {
    render(
      <AppDialog open title="Dialog title" maxWidth="md" fullWidth data-testid="dialog-root">
        Dialog body
      </AppDialog>,
    );

    expect(screen.getByTestId('dialog-root')).toBeInTheDocument();
  });

  it('prevents escape close while close is disabled', () => {
    const onClose = vi.fn();

    render(
      <AppDialog open title="Dialog title" onClose={onClose} preventClose>
        Dialog body
      </AppDialog>,
    );

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
  });
});
