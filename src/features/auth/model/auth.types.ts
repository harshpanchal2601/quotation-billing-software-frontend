import type { Permission } from './permissions';

export type UserRole = 'ADMIN';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'LOCKED';
export type AccountType = 'SUPER_ADMIN' | 'FIRM_ADMIN' | 'FIRM_USER';

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  username: string;
  role: UserRole;
  status: UserStatus;
  accountType: AccountType;
  firmId: number | null;
  firm: { id: number; name: string; slug: string } | null;
  firmRole: { id: number; name: string } | null;
  permissions: Permission[];
  mustChangePassword: boolean;
};

export type AuthUserResponse = {
  user: AuthUser;
};

export type LoginInput = {
  identifier: string;
  password: string;
};

export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};
