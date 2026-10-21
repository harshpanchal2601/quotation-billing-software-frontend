import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '@features/auth';
import { FullPageLoader } from '@shared/components/common/FullPageLoader';

import { paths } from '../routeConfig';

export function ProtectedRoute() {
  const location = useLocation();
  const { user, isAuthenticated, isInitialising } = useAuth();

  if (isInitialising) return <FullPageLoader />;

  if (!isAuthenticated) {
    return <Navigate to={paths.login} replace state={{ from: location }} />;
  }

  if (user?.mustChangePassword && location.pathname !== paths.changePassword) {
    return <Navigate to={paths.changePassword} replace />;
  }

  return <Outlet />;
}
