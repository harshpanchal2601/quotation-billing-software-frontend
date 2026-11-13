import { useMutation, useQueryClient } from '@tanstack/react-query';

export function usePlatformOperation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (operation: () => Promise<unknown>) => operation(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] !== 'auth' });
    },
  });
}
