import { useQuery } from '@tanstack/react-query';
import { subscriptionsApi } from './subscriptions.api';

export function useSubscriptionOptions() {
  return useQuery({
    queryKey: ['platform', 'subscription-options'],
    queryFn: ({ signal }) => subscriptionsApi.options(signal),
    staleTime: 5 * 60_000,
  });
}
