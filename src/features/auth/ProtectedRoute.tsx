import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { FullPageLoader } from '../../components/common/FullPageLoader';
import { paths } from '../../routes/routeConfig';
import { useAuth } from './auth.hooks';

export function ProtectedRoute() {
  const location = useLocation();
  const { isAuthenticated, isInitialising } = useAuth();

  if (isInitialising) return <FullPageLoader />;

  if (!isAuthenticated) {
    return <Navigate to={paths.login} replace state={{ from: location }} />;
  }

  return <Outlet />;
}
