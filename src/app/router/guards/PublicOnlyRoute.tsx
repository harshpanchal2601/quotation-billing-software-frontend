import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { getDefaultAuthenticatedPath, useAuth } from '@features/auth';
import { FullPageLoader } from '@shared/components/common/FullPageLoader';


export function PublicOnlyRoute() {
  const location = useLocation();
  const { user, isAuthenticated, isInitialising } = useAuth();

  if (isInitialising) return <FullPageLoader />;

  if (isAuthenticated) {
    return user ? <Navigate to={getDefaultAuthenticatedPath(user)} replace state={location.state} /> : null;
  }

  return <Outlet />;
}
