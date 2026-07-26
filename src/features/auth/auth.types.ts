export type UserRole = 'ADMIN';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'LOCKED';

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  username: string;
  role: UserRole;
  status: UserStatus;
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
