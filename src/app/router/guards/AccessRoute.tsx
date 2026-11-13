import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuth, type AccountType, type Permission } from '@features/auth';
import { useSelectedFirm } from '@shared/tenancy/selectedFirm';
import { permitsEntitledPermission, useEntitlements } from '@shared/tenancy/entitlements';
import { FullPageLoader } from '@shared/components/common/FullPageLoader';
import { ErrorState } from '@shared/components/common/ErrorState';
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
  const access = useEntitlements(user, tenantScoped && permissions !== undefined);

  if (user === null) return null;
  if (accountTypes !== undefined && !accountTypes.includes(user.accountType)) {
    return <Navigate to={paths.accessDenied} replace />;
  }
  if (tenantScoped && user.accountType === 'SUPER_ADMIN' && selectedFirm === null) {
    return <Navigate to={paths.platformFirms} replace />;
  }
  if (permissions !== undefined && !permissions.some((permission) => user.permissions.includes(permission))) {
    return <Navigate to={paths.accessDenied} replace />;
  }
  if (tenantScoped && permissions !== undefined) {
    if (access.isPending) return <FullPageLoader />;
    if (access.isError) return <ErrorState message="Your subscribed access could not be checked." onRetry={() => { void access.refetch(); }} />;
    if (!permitsEntitledPermission(access.data, permissions)) return <Navigate to={paths.accessDenied} replace />;
  }
  return <>{children}</>;
}
