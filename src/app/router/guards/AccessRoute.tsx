import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import { getDefaultAuthenticatedPath, useAuth, type AccountType, type Permission } from '@features/auth';
import { useSelectedFirm } from '@shared/tenancy/selectedFirm';
import { paths } from '../routeConfig';

type AccessRouteProps = {
  children: ReactNode;
  permissions?: Permission[];
  accountTypes?: AccountType[];
  tenantScoped?: boolean;
};

export function AccessRoute({ children, permissions, accountTypes, tenantScoped = true }: AccessRouteProps) {
  const { user } = useAuth();
  const selectedFirm = useSelectedFirm();

  if (user === null) return null;
  if (accountTypes !== undefined && !accountTypes.includes(user.accountType)) {
    return <Navigate to={getDefaultAuthenticatedPath(user)} replace />;
  }
  if (tenantScoped && user.accountType === 'SUPER_ADMIN' && selectedFirm === null) {
    return <Navigate to={paths.platformFirms} replace />;
  }
  if (permissions !== undefined && !permissions.some((permission) => user.permissions.includes(permission))) {
    return <Navigate to={getDefaultAuthenticatedPath(user)} replace />;
  }
  return <>{children}</>;
}
