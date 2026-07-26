import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../test/render';
import { LoginPage } from './LoginPage';

vi.mock('./auth.hooks', () => ({
  useAuth: () => ({
    login: vi.fn().mockResolvedValue({ id: 1, name: 'Admin', email: 'admin@example.com', username: 'admin', role: 'ADMIN', status: 'ACTIVE' }),
    authError: null,
    clearAuthError: vi.fn(),
    isLoggingIn: false,
    sessionMessage: null,
    clearSessionMessage: vi.fn(),
  }),
}));

describe('LoginPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders identifier and password fields', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByLabelText(/email or username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);
    const password = screen.getByLabelText(/^password$/i);
    expect(password).toHaveAttribute('type', 'password');
    await user.click(screen.getByLabelText(/show password/i));
    expect(password).toHaveAttribute('type', 'text');
  });

  it('shows validation messages for empty submission', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/email or username is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
  });
});
