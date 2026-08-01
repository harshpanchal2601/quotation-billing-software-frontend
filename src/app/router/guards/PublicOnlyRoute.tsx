import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '@features/auth';
import { FullPageLoader } from '@shared/components/common/FullPageLoader';

import { paths } from '../routeConfig';

export function PublicOnlyRoute() {
  const location = useLocation();
  const { isAuthenticated, isInitialising } = useAuth();

  if (isInitialising) return <FullPageLoader />;

  if (isAuthenticated) {
    return <Navigate to={paths.dashboard} replace state={location.state} />;
  }

  return <Outlet />;
}
