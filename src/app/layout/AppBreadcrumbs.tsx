import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { Link as RouterLink, useLocation } from 'react-router-dom';

import { getRouteTitle, navigationItems, paths } from '../router/routeConfig';

export function AppBreadcrumbs() {
  const location = useLocation();
  const title = getRouteTitle(location.pathname);
  const isCompanyChild = location.pathname.startsWith(`${paths.companies}/`);
  const isItemChild = location.pathname.startsWith(`${paths.items}/`);
  const isQuotationChild = location.pathname.startsWith(`${paths.quotations}/`);
  const navItem = navigationItems.find((item) => item.path === location.pathname);
  const sectionName = navItem?.section && navItem.section !== 'Main' ? navItem.section : undefined;

  return (
    <Breadcrumbs
      aria-label="Breadcrumbs"
      sx={{
        fontSize: 13,
        minWidth: 0,
        '& .MuiBreadcrumbs-ol': { flexWrap: 'nowrap', minWidth: 0 },
        '& .MuiBreadcrumbs-li': { minWidth: 0, maxWidth: '100%' },
      }}
    >
      <Link component={RouterLink} to={paths.dashboard} underline="hover" color="text.secondary" noWrap>
        Dashboard
      </Link>
      {isCompanyChild ? (
        <Link component={RouterLink} to={paths.companies} underline="hover" color="text.secondary" noWrap>
          Companies
        </Link>
      ) : isItemChild ? (
        <>
          <Typography color="text.secondary" fontSize={13} noWrap>
            Master Management
          </Typography>
          <Link component={RouterLink} to={paths.items} underline="hover" color="text.secondary" noWrap>
            Items
          </Link>
        </>
      ) : isQuotationChild ? (
        <>
          <Typography color="text.secondary" fontSize={13} noWrap>
            Quotation Management
          </Typography>
          <Link component={RouterLink} to={paths.quotations} underline="hover" color="text.secondary" noWrap>
            Quotations
          </Link>
        </>
      ) : sectionName ? (
        <Typography color="text.secondary" fontSize={13} noWrap>
          {sectionName}
        </Typography>
      ) : null}
      {location.pathname !== paths.dashboard ? (
        <Typography color="text.primary" fontSize={13} noWrap sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</Typography>
      ) : null}
    </Breadcrumbs>
  );
}
