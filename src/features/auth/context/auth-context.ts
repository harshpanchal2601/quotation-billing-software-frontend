import { createContext } from 'react';

import type { ApiError } from '@shared/api/apiClient';
import type { AuthUser, ChangePasswordInput, LoginInput } from '../model/auth.types';

export type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isInitialising: boolean;
  isLoggingIn: boolean;
  isLoggingOut: boolean;
  isChangingPassword: boolean;
  authError: ApiError | null;
  sessionMessage: string | null;
  login: (input: LoginInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
  changePassword: (input: ChangePasswordInput) => Promise<void>;
  clearAuthError: () => void;
  clearSessionMessage: () => void;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
