import Alert from '@mui/material/Alert';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ConfirmDialog } from './ConfirmDialog';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';

describe('ConfirmDialog', () => {
  it('renders supplied title and content', () => {
    render(
      <ConfirmDialog open title="Change status" confirmLabel="Deactivate" onClose={vi.fn()} onConfirm={vi.fn()}>
        <Alert severity="warning">Status warning</Alert>
      </ConfirmDialog>,
    );

    expect(screen.getByRole('dialog', { name: 'Change status' })).toBeInTheDocument();
    expect(screen.getByText('Status warning')).toBeInTheDocument();
  });

  it('calls cancel and confirm callbacks', async () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(
      <ConfirmDialog open title="Change status" confirmLabel="Deactivate" onClose={onClose} onConfirm={onConfirm}>
        Confirm content
      </ConfirmDialog>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await userEvent.click(screen.getByRole('button', { name: 'Deactivate' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('disables close and confirm controls while processing', async () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(
      <ConfirmDialog
        open
        title="Change status"
        confirmLabel="Deactivate"
        isConfirming
        onClose={onClose}
        onConfirm={onConfirm}
      >
        Confirm content
      </ConfirmDialog>,
    );

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Deactivate' })).toBeDisabled();

    await userEvent.keyboard('{Escape}');

    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('DeleteConfirmDialog', () => {
  it('uses destructive confirm styling and loading-safe close behaviour', () => {
    render(
      <DeleteConfirmDialog
        open
        title="Delete record"
        confirmLabel="Delete"
        isDeleting
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      >
        Delete content
      </DeleteConfirmDialog>,
    );

    const deleteButton = screen.getByRole('button', { name: 'Delete' });

    expect(deleteButton).toBeDisabled();
    expect(deleteButton).toHaveAttribute('aria-busy', 'true');
    expect(deleteButton).toHaveClass('MuiButton-colorError');
  });
});
