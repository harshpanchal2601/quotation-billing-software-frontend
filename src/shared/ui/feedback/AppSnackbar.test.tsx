import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppSnackbar } from './AppSnackbar';

describe('AppSnackbar', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders a filled success alert by default', () => {
    render(<AppSnackbar open message="Saved." onClose={vi.fn()} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Saved.');
  });

  it('supports closing from the alert close button', async () => {
    const onClose = vi.fn();

    render(<AppSnackbar open message="Saved." onClose={onClose} />);

    await userEvent.click(screen.getByRole('button', { name: /close/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('uses the shared 5000ms auto-hide duration by default', () => {
    const onClose = vi.fn();
    vi.useFakeTimers();

    render(<AppSnackbar open message="Saved." onClose={onClose} />);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
