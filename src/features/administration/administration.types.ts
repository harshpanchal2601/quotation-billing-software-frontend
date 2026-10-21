import type { AccountType, Permission } from '@features/auth';

export type FirmRole = {
  id: number;
  name: string;
  description: string | null;
  permissions: Permission[];
  isSystem: boolean;
  _count?: { users: number };
};

export type FirmUser = {
  id: number;
  name: string;
  email: string;
  username: string;
  accountType: AccountType;
  status: 'ACTIVE' | 'INACTIVE' | 'LOCKED';
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  firmRole: { id: number; name: string } | null;
};

export type RoleInput = { name: string; description?: string | null; permissions: Permission[] };
export type UserCreateInput = {
  name: string;
  email: string;
  username: string;
  roleId: number;
  temporaryPassword: string;
};
