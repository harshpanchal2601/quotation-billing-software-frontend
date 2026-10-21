import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@shared/test/render';
import { LoginPage } from './LoginPage';

const authMock = vi.hoisted(() => ({
  login: vi.fn(),
  clearAuthError: vi.fn(),
  clearSessionMessage: vi.fn(),
  isLoggingIn: false,
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    login: authMock.login,
    authError: null,
    clearAuthError: authMock.clearAuthError,
    isLoggingIn: authMock.isLoggingIn,
    sessionMessage: null,
    clearSessionMessage: authMock.clearSessionMessage,
  }),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.isLoggingIn = false;
    authMock.login.mockResolvedValue({ id: 1, name: 'Admin', email: 'admin@example.com', username: 'admin', role: 'ADMIN', status: 'ACTIVE' });
  });

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

  it('shows login pending state and disables duplicate interaction', () => {
    authMock.isLoggingIn = true;
    const { container } = renderWithProviders(<LoginPage />);

    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
    expect(screen.getByLabelText(/email or username/i)).toBeDisabled();
    expect(screen.getByLabelText(/^password$/i)).toBeDisabled();
    expect(container.querySelector('form')).toHaveAttribute('aria-busy', 'true');
  });
});
