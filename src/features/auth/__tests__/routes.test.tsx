import { screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { theme } from '@app/theme/theme';
import { ProtectedRoute } from '@app/router/guards/ProtectedRoute';
import { PublicOnlyRoute } from '@app/router/guards/PublicOnlyRoute';

const authState = vi.hoisted(() => ({
  isAuthenticated: false,
  isInitialising: false,
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => authState,
}));

describe('auth route guards', () => {
  function renderRoutes(route: string, ui: ReactElement) {
    return render(
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </ThemeProvider>,
    );
  }

  it('prevents protected-content flashing during initialisation', () => {
    authState.isInitialising = true;
    authState.isAuthenticated = false;

    renderRoutes(
      '/dashboard',
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<div>Protected dashboard</div>} />
        </Route>
      </Routes>,
    );

    expect(screen.getByText(/loading buminex/i)).toBeInTheDocument();
    expect(screen.queryByText(/protected dashboard/i)).not.toBeInTheDocument();
  });

  it('redirects unauthenticated protected routes to login', () => {
    authState.isInitialising = false;
    authState.isAuthenticated = false;

    renderRoutes(
      '/dashboard',
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<div>Protected dashboard</div>} />
        </Route>
        <Route path="/login" element={<div>Login page</div>} />
      </Routes>,
    );

    expect(screen.getByText(/login page/i)).toBeInTheDocument();
  });

  it('redirects authenticated users away from login', () => {
    authState.isInitialising = false;
    authState.isAuthenticated = true;

    renderRoutes(
      '/login',
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<div>Login page</div>} />
        </Route>
        <Route path="/dashboard" element={<div>Dashboard page</div>} />
      </Routes>,
    );

    expect(screen.getByText(/dashboard page/i)).toBeInTheDocument();
  });
});
