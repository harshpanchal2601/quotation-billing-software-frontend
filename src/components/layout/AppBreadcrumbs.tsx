import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { Link as RouterLink, useLocation } from 'react-router-dom';

import { getRouteTitle, navigationItems, paths } from '../../routes/routeConfig';

export function AppBreadcrumbs() {
  const location = useLocation();
  const title = getRouteTitle(location.pathname);
  const isCompanyChild = location.pathname.startsWith(`${paths.companies}/`);
  const isItemChild = location.pathname.startsWith(`${paths.items}/`);
  const isQuotationChild = location.pathname.startsWith(`${paths.quotations}/`);
  const navItem = navigationItems.find((item) => item.path === location.pathname);
  const sectionName = navItem?.section && navItem.section !== 'Main' ? navItem.section : undefined;

  return (
    <Breadcrumbs aria-label="Breadcrumbs" sx={{ fontSize: 13 }}>
      <Link component={RouterLink} to={paths.dashboard} underline="hover" color="text.secondary">
        Dashboard
      </Link>
      {isCompanyChild ? (
        <Link component={RouterLink} to={paths.companies} underline="hover" color="text.secondary">
          Companies
        </Link>
      ) : isItemChild ? (
        <>
          <Typography color="text.secondary" fontSize={13}>
            Master Management
          </Typography>
          <Link component={RouterLink} to={paths.items} underline="hover" color="text.secondary">
            Items
          </Link>
        </>
      ) : isQuotationChild ? (
        <>
          <Typography color="text.secondary" fontSize={13}>
            Quotation Management
          </Typography>
          <Link component={RouterLink} to={paths.quotations} underline="hover" color="text.secondary">
            Quotations
          </Link>
        </>
      ) : sectionName ? (
        <Typography color="text.secondary" fontSize={13}>
          {sectionName}
        </Typography>
      ) : null}
      {location.pathname !== paths.dashboard ? (
        <Typography color="text.primary" fontSize={13}>{title}</Typography>
      ) : null}
    </Breadcrumbs>
  );
}
