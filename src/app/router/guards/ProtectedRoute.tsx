import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '@features/auth';
import { FullPageLoader } from '@shared/components/common/FullPageLoader';

import { paths } from '../routeConfig';

export function ProtectedRoute() {
  const location = useLocation();
  const { isAuthenticated, isInitialising } = useAuth();

  if (isInitialising) return <FullPageLoader />;

  if (!isAuthenticated) {
    return <Navigate to={paths.login} replace state={{ from: location }} />;
  }

  return <Outlet />;
}
