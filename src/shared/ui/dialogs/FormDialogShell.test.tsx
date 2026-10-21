import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { FormActions } from '../../forms';
import { FormDialogShell } from './FormDialogShell';

describe('FormDialogShell', () => {
  it('renders children and submits through the provided form handler', async () => {
    const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => event.preventDefault());

    render(
      <FormDialogShell
        open
        title="Edit record"
        onClose={vi.fn()}
        onSubmit={onSubmit}
        actions={(formId) => (
          <FormActions submitLabel="Save" onCancel={vi.fn()} submitButtonProps={{ form: formId }} />
        )}
      >
        <input aria-label="Name" />
      </FormDialogShell>,
    );

    await userEvent.type(screen.getByLabelText('Name'), 'Alpha{Enter}');

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('does not submit twice while loading disables actions', async () => {
    const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => event.preventDefault());

    render(
      <FormDialogShell
        open
        title="Edit record"
        onClose={vi.fn()}
        onSubmit={onSubmit}
        isSubmitting
        actions={(formId) => (
          <FormActions
            submitLabel="Save"
            isSubmitting
            onCancel={vi.fn()}
            submitButtonProps={{ form: formId }}
          />
        )}
      >
        <input aria-label="Name" />
      </FormDialogShell>,
    );

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('prevents close while submitting', async () => {
    const onClose = vi.fn();

    render(
      <FormDialogShell
        open
        title="Edit record"
        onClose={onClose}
        onSubmit={vi.fn()}
        isSubmitting
        actions={(formId) => (
          <FormActions submitLabel="Save" isSubmitting onCancel={onClose} submitButtonProps={{ form: formId }} />
        )}
      >
        <input aria-label="Name" />
      </FormDialogShell>,
    );

    await userEvent.keyboard('{Escape}');

    expect(onClose).not.toHaveBeenCalled();
  });
});
