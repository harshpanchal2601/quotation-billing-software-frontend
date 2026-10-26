import type { Permission } from '../model/permissions';
import { useAuth } from './useAuth';
import { permitsEntitledPermission, useEntitlements } from '@shared/tenancy/entitlements';

export function useHasPermission(...permissions: Permission[]) {
  const { user } = useAuth();
  const access = useEntitlements(user);
  return user !== null && permitsEntitledPermission(access.data, permissions.filter((permission) => user.permissions.includes(permission)));
}
