import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ServerErrorAlert } from './ServerErrorAlert';

describe('ServerErrorAlert', () => {
  it('does not render without a message', () => {
    render(<ServerErrorAlert message={null} />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders an optional title and message', () => {
    render(<ServerErrorAlert title="Unable to save" message="Duplicate name." />);

    expect(screen.getByRole('alert')).toHaveTextContent('Unable to save');
    expect(screen.getByRole('alert')).toHaveTextContent('Duplicate name.');
  });

  it('supports dismissing server errors', async () => {
    const onDismiss = vi.fn();

    render(<ServerErrorAlert message="Request failed." onDismiss={onDismiss} />);

    await userEvent.click(screen.getByRole('button', { name: /close/i }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
