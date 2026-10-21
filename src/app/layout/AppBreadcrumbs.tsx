import Breadcrumbs from '@mui/material/Breadcrumbs';
import Box from '@mui/material/Box';
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
  const sectionName = isItemChild ? 'Master Management'
    : isQuotationChild ? 'Quotation Management'
      : navItem?.section && navItem.section !== 'Main' ? navItem.section : undefined;
  const parentPath = isCompanyChild ? paths.companies : isItemChild ? paths.items : isQuotationChild ? paths.quotations : undefined;
  const parentTitle = navigationItems.find((item) => item.path === parentPath)?.title;

  return (
    <Box minWidth={0}>
      <Typography sx={{ display: { xs: 'block', sm: 'none' }, fontWeight: 600 }} noWrap title={title}>
        {title}
      </Typography>
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
        <Link component={RouterLink} to={paths.dashboard} underline="hover" color="text.secondary" noWrap>
          Dashboard
        </Link>
        {sectionName ? (
          <Typography color="text.secondary" fontSize={13} noWrap>{sectionName}</Typography>
        ) : null}
        {parentPath ? (
          <Link component={RouterLink} to={parentPath} underline="hover" color="text.secondary" noWrap>
            {parentTitle}
          </Link>
        ) : null}
        {location.pathname !== paths.dashboard ? (
          <Typography color="text.primary" fontSize={13} noWrap>{title}</Typography>
        ) : null}
      </Breadcrumbs>
    </Box>
  );
}
