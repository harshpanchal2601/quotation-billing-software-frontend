import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@shared/test/render';
import { ChangePasswordPage } from './ChangePasswordPage';

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    changePassword: vi.fn().mockResolvedValue(undefined),
    authError: null,
    isChangingPassword: false,
  }),
}));

describe('ChangePasswordPage', () => {
  it('renders the password policy and fields', () => {
    renderWithProviders(<ChangePasswordPage />);

    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
    expect(screen.getByText(/at least one uppercase letter/i)).toBeInTheDocument();
  });

  it('validates weak and mismatched new passwords', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChangePasswordPage />);

    await user.type(screen.getByLabelText(/current password/i), 'StrongPass1!');
    await user.type(screen.getByLabelText(/^new password$/i), 'weak');
    await user.type(screen.getByLabelText(/confirm new password/i), 'different');
    await user.click(screen.getByRole('button', { name: /change password/i }));

    expect(await screen.findByText(/use at least 10 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/new password and confirmation do not match/i)).toBeInTheDocument();
  });
});
