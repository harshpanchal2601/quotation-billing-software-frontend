import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, type AxiosResponse } from 'axios';
import { useEffect } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiErrorResponse } from '@shared/api/apiClient';
import { renderWithProviders } from '@shared/test/render';
import { loginRequest } from '../api/auth.api';
import { useAuth } from '../hooks/useAuth';
import { LoginPage } from './LoginPage';

vi.mock('../api/auth.api', () => ({
  authQueryKey: ['auth', 'me'],
  getCurrentUserRequest: vi.fn().mockResolvedValue(null),
  loginRequest: vi.fn(),
  logoutRequest: vi.fn(),
  changePasswordRequest: vi.fn(),
}));

function loginError(status: number, message?: string, errors?: unknown) {
  return new AxiosError<ApiErrorResponse>('Request failed', undefined, undefined, undefined, {
    status,
    data: { success: false, message, errors },
  } as AxiosResponse<ApiErrorResponse>);
}

async function submitLogin() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/email or username/i), 'example-user');
  await user.type(screen.getByLabelText(/^password$/i), 'incorrect-password');
  await user.click(screen.getByRole('button', { name: /sign in/i }));
  return user;
}

describe('LoginPage with AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps a rejected login visible, shows a toast on retries, and preserves entered values', async () => {
    vi.mocked(loginRequest).mockRejectedValue(loginError(401, 'Invalid email, username or password'));
    renderWithProviders(<LoginPage />);

    const user = await submitLogin();
    const message = 'Email, username or password is incorrect. Please try again.';
    await waitFor(() => expect(screen.getAllByText(message)).toHaveLength(2));
    const toast = screen.getAllByRole('alert').find((alert) => within(alert).queryByRole('button', { name: /close/i }));
    expect(toast).toBeDefined();
    await user.click(within(toast!).getByRole('button', { name: /close/i }));
    await waitFor(() => expect(screen.getAllByText(message)).toHaveLength(1));
    expect(screen.getByLabelText(/^password$/i)).toHaveValue('incorrect-password');
    expect(screen.getByLabelText(/email or username/i)).toHaveValue('example-user');

    await user.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(screen.getAllByText(message)).toHaveLength(2));
    expect(loginRequest).toHaveBeenCalledTimes(2);
  });

  it.each([
    [403, 'Account is locked', 'Account is locked'],
    [429, 'Too many login attempts. Please try again later.', 'Too many login attempts. Please try again later.'],
    [503, 'Internal server error', 'The service is temporarily unavailable. Please try again shortly.'],
    [401, undefined, 'Email, username or password is incorrect. Please try again.'],
  ])('shows the appropriate message for HTTP %s', async (status, backendMessage, expected) => {
    vi.mocked(loginRequest).mockRejectedValue(loginError(status, backendMessage));
    renderWithProviders(<LoginPage />);
    await submitLogin();
    await waitFor(() => expect(screen.getAllByText(expected)).toHaveLength(2));
  });

  it('maps server validation errors to the corresponding login field', async () => {
    vi.mocked(loginRequest).mockRejectedValue(loginError(400, 'Invalid input', {
      fieldErrors: { identifier: ['Check your username'] },
    }));
    renderWithProviders(<LoginPage />);
    await submitLogin();
    expect(await screen.findByText('Check your username')).toBeInTheDocument();
    expect(screen.getByLabelText(/email or username/i)).toHaveAttribute('aria-invalid', 'true');
  });

  it('keeps the clear callbacks stable while auth state changes', async () => {
    const callbacks = vi.fn();
    function ObserveAuth() {
      const { clearAuthError, clearSessionMessage, login } = useAuth();
      useEffect(() => { callbacks(clearAuthError, clearSessionMessage); }, [clearAuthError, clearSessionMessage]);
      return <button onClick={() => void login({ identifier: 'example-user', password: 'incorrect-password' }).catch(() => undefined)}>Attempt login</button>;
    }
    vi.mocked(loginRequest).mockRejectedValue(loginError(401));
    renderWithProviders(<ObserveAuth />);
    await act(async () => { screen.getByRole('button', { name: 'Attempt login' }).click(); });
    await waitFor(() => expect(loginRequest).toHaveBeenCalledOnce());
    expect(callbacks).toHaveBeenCalledOnce();
  });
});
