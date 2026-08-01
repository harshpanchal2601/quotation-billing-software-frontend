import { type PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { setAuthenticationFailureHandler, toApiError, type ApiError } from '@shared/api/apiClient';
import {
  authQueryKey,
  changePasswordRequest,
  getCurrentUserRequest,
  loginRequest,
  logoutRequest,
} from '../api/auth.api';
import { AuthContext, type AuthContextValue } from './auth-context';
import type { AuthUser } from '../model/auth.types';

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [authError, setAuthError] = useState<ApiError | null>(null);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);

  const currentUserQuery = useQuery({
    queryKey: authQueryKey,
    queryFn: getCurrentUserRequest,
    retry: (failureCount, error) => {
      const apiError = toApiError(error);
      return apiError.statusCode !== 401 && apiError.statusCode !== 403 && failureCount < 1;
    },
    staleTime: 5 * 60 * 1000,
  });

  const clearAuthenticatedState = useCallback(() => {
    queryClient.setQueryData<AuthUser | null>(authQueryKey, null);
    void queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] !== 'auth' });
  }, [queryClient]);

  useEffect(() => {
    setAuthenticationFailureHandler(() => {
      clearAuthenticatedState();
      setSessionMessage('Your session has expired. Please sign in again.');
    });

    return () => setAuthenticationFailureHandler(null);
  }, [clearAuthenticatedState]);

  const loginMutation = useMutation({
    mutationFn: loginRequest,
    onSuccess: (user) => {
      setAuthError(null);
      setSessionMessage(null);
      queryClient.setQueryData(authQueryKey, user);
    },
    onError: (error) => setAuthError(toApiError(error)),
  });

  const logoutMutation = useMutation({
    mutationFn: logoutRequest,
    onSettled: () => {
      clearAuthenticatedState();
      queryClient.setQueryData(authQueryKey, null);
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: changePasswordRequest,
    onSuccess: () => {
      clearAuthenticatedState();
      queryClient.setQueryData(authQueryKey, null);
    },
    onError: (error) => setAuthError(toApiError(error)),
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      user: currentUserQuery.data ?? null,
      isAuthenticated: currentUserQuery.data !== undefined && currentUserQuery.data !== null,
      isInitialising: currentUserQuery.isPending,
      isLoggingIn: loginMutation.isPending,
      isLoggingOut: logoutMutation.isPending,
      isChangingPassword: changePasswordMutation.isPending,
      authError,
      sessionMessage,
      login: loginMutation.mutateAsync,
      logout: logoutMutation.mutateAsync,
      changePassword: changePasswordMutation.mutateAsync,
      clearAuthError: () => setAuthError(null),
      clearSessionMessage: () => setSessionMessage(null),
    }),
    [
      authError,
      changePasswordMutation.isPending,
      changePasswordMutation.mutateAsync,
      currentUserQuery.data,
      currentUserQuery.isPending,
      loginMutation.isPending,
      loginMutation.mutateAsync,
      logoutMutation.isPending,
      logoutMutation.mutateAsync,
      sessionMessage,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
