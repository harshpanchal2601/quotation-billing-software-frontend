import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { FormActions } from './FormActions';

describe('FormActions', () => {
  it('renders cancel and submit labels with submit type', async () => {
    const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => event.preventDefault());

    render(
      <form onSubmit={onSubmit}>
        <FormActions submitLabel="Create" onCancel={vi.fn()} />
      </form>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Create' }));

    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveAttribute('type', 'button');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('calls cancel without submitting', async () => {
    const onCancel = vi.fn();
    const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => event.preventDefault());

    render(
      <form onSubmit={onSubmit}>
        <FormActions submitLabel="Save" onCancel={onCancel} />
      </form>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('disables actions while loading', () => {
    render(<FormActions submitLabel="Save" isSubmitting onCancel={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('aria-busy', 'true');
  });

  it('supports disabled submit state and secondary actions', () => {
    render(
      <FormActions
        submitLabel="Save"
        isSubmitDisabled
        onCancel={vi.fn()}
        secondaryAction={<button type="button">Reset</button>}
      />,
    );

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
  });
});
