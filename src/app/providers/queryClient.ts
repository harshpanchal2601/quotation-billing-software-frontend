import { QueryClient } from '@tanstack/react-query';

import { toApiError } from '../services/apiClient';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => failureCount < 1 && toApiError(error).retryable,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});
