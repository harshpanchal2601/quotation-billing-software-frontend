import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AppButton } from './AppButton';

describe('AppButton', () => {
  it('preserves native button submit behaviour', async () => {
    const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => event.preventDefault());

    render(
      <form onSubmit={onSubmit}>
        <AppButton type="submit">Save</AppButton>
      </form>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('supports MUI button icons and variant props', () => {
    render(
      <AppButton variant="contained" startIcon={<SaveOutlinedIcon />}>
        Save
      </AppButton>,
    );

    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('disables interaction and exposes busy state while loading', async () => {
    const onClick = vi.fn();

    render(
      <AppButton isLoading loadingLabel="Saving" onClick={onClick}>
        Save
      </AppButton>,
    );

    const button = screen.getByRole('button', { name: 'Saving' });

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');

    fireEvent.click(button);

    expect(onClick).not.toHaveBeenCalled();
  });
});
