import type { Permission } from '../model/permissions';
import { useAuth } from './useAuth';

export function useHasPermission(...permissions: Permission[]) {
  const { user } = useAuth();
  return user !== null && permissions.some((permission) => user.permissions.includes(permission));
}
