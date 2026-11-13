import Breadcrumbs from '@mui/material/Breadcrumbs';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { Link as RouterLink, useLocation } from 'react-router-dom';

import { useAuth } from '@features/auth';
import { useEntitlements } from '@shared/tenancy/entitlements';
import { useSelectedFirm } from '@shared/tenancy/selectedFirm';
import { canAccessNavigationItem, getRouteBreadcrumbs, getRouteTitle, navigationItems, paths } from '../router/routeConfig';

export function AppBreadcrumbs() {
  const location = useLocation();
  const title = getRouteTitle(location.pathname);
  const { user } = useAuth();
  const access = useEntitlements(user);
  const selectedFirm = useSelectedFirm();
  const dashboard = navigationItems.find((item) => item.path === paths.dashboard);
  const showDashboard = user !== null && dashboard !== undefined && canAccessNavigationItem(dashboard, user, selectedFirm !== null, access.data);
  const crumbs = getRouteBreadcrumbs(location.pathname);
  const canFollow = (path: string) => {
    const parent = navigationItems.filter((item) => path === item.path || path.startsWith(`${item.path}/`)).sort((left, right) => right.path.length - left.path.length)[0];
    return user !== null && parent !== undefined && canAccessNavigationItem({ ...parent, fallback: undefined }, user, selectedFirm !== null, access.data);
  };
  const mobileParent = [...crumbs].reverse().find((crumb) => crumb.path && canFollow(crumb.path));

  return (
    <Box minWidth={0}>
      <Box sx={{ display: { xs: 'block', sm: 'none' }, minWidth: 0 }}>
        {mobileParent?.path ? <Link component={RouterLink} to={mobileParent.path} underline="hover" fontSize={12} aria-label={`Back to ${mobileParent.title}`}>← {mobileParent.title}</Link> : null}
        <Typography sx={{ fontWeight: 600 }} noWrap title={title}>{title}</Typography>
      </Box>
      <Breadcrumbs
        aria-label="Breadcrumbs"
        sx={{
          fontSize: 13,
          display: { xs: 'none', sm: 'block' },
          minWidth: 0,
          '& .MuiBreadcrumbs-ol': { flexWrap: 'nowrap', minWidth: 0 },
          '& .MuiBreadcrumbs-li': { minWidth: 0, maxWidth: '100%' },
        }}
      >
        {showDashboard ? <Link component={RouterLink} to={paths.dashboard} underline="hover" color="text.secondary" noWrap>Dashboard</Link> : null}
        {crumbs.map((crumb, index) => crumb.path && canFollow(crumb.path) ? <Link key={`${crumb.path}:${index}`} component={RouterLink} to={crumb.path} underline="hover" color="text.secondary" noWrap>{crumb.title}</Link> : <Typography key={`${crumb.title}:${index}`} color={index === crumbs.length - 1 ? 'text.primary' : 'text.secondary'} fontSize={13} aria-current={index === crumbs.length - 1 ? 'page' : undefined} noWrap>{crumb.title}</Typography>)}
      </Breadcrumbs>
    </Box>
  );
}
