import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import { type ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';

import { theme } from '@app/theme/theme';
import { AuthProvider } from '@features/auth';

type RenderWithProvidersOptions = RenderOptions & {
  route?: string;
  queryClient?: QueryClient;
};

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

export function renderWithProviders(ui: ReactElement, options: RenderWithProvidersOptions = {}) {
  const queryClient = options.queryClient ?? createTestQueryClient();
  const route = options.route ?? '/';

  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={[route]}>
          <AuthProvider>{ui}</AuthProvider>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
    options,
  );
}
