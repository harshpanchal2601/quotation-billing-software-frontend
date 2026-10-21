import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import MenuOutlinedIcon from '@mui/icons-material/MenuOutlined';
import PasswordOutlinedIcon from '@mui/icons-material/PasswordOutlined';
import Box from '@mui/material/Box';
import AppBar from '@mui/material/AppBar';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useState, type MouseEvent } from 'react';
import { Link as RouterLink, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '@features/auth';
import { AppBrand } from '@shared/components/brand/AppBrand';
import { UserAvatar } from '@shared/components/common/UserAvatar';
import { AppIconButton } from '@shared/ui/actions';

import { navigationItems, paths } from '../router/routeConfig';
import { designTokens } from '../theme/tokens';
import { AppBreadcrumbs } from './AppBreadcrumbs';

const sections = ['Main', 'Quotation Management', 'Master Management', 'Configuration', 'System'] as const;

export function AppLayout() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isLoggingOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  async function handleLogout() {
    setMenuAnchor(null);
    await logout();
    navigate(paths.login, { replace: true });
  }

  function openProfileMenu(event: MouseEvent<HTMLElement>) {
    setMenuAnchor(event.currentTarget);
  }

  const drawer = (
    <Stack height="100%">
      <Box px={2.5} py={2}>
        <AppBrand />
      </Box>
      <Divider />
      <Box component="nav" flex={1} py={1.5} overflow="auto">
        {sections.map((section) => {
          const items = navigationItems.filter((item) => item.section === section);
          return (
            <List
              key={section}
              dense
              subheader={
                section === 'Main' ? undefined : (
                  <ListSubheader disableSticky sx={{ bgcolor: 'transparent', fontSize: 11, fontWeight: 700, letterSpacing: 0.4, color: 'text.secondary' }}>
                    {section}
                  </ListSubheader>
                )
              }
            >
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <MenuItem
                    key={item.path}
                    component={NavLink}
                    to={item.path}
                    selected={
                      location.pathname === item.path ||
                      (item.path !== paths.dashboard && location.pathname.startsWith(`${item.path}`))
                    }
                    onClick={() => setMobileOpen(false)}
                    sx={{ mx: 1, my: 0.25, borderRadius: 2 }}
                  >
                    <ListItemIcon><Icon fontSize="small" /></ListItemIcon>
                    <ListItemText primary={item.title} />
                  </MenuItem>
                );
              })}
            </List>
          );
        })}
      </Box>
      {user ? (
        <Box p={2} borderTop={1} borderColor="divider">
          <Stack direction="row" spacing={1.25} alignItems="center">
            <UserAvatar name={user.name} />
            <Box minWidth={0}>
              <Typography fontWeight={700} noWrap>{user.name}</Typography>
              <Typography variant="body2" color="text.secondary" noWrap>{user.email}</Typography>
            </Box>
          </Stack>
        </Box>
      ) : null}
    </Stack>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', maxWidth: '100vw', overflowX: 'hidden' }}>
      <Box
        component="a"
        href="#main-content"
        sx={{
          position: 'fixed',
          top: 8,
          left: 8,
          zIndex: theme.zIndex.tooltip,
          bgcolor: 'background.paper',
          px: 2,
          py: 1,
          borderRadius: 1,
          transform: 'translateY(-140%)',
          '&:focus': { transform: 'translateY(0)' },
        }}
      >
        Skip to content
      </Box>
      <AppBar color="inherit" position="fixed" sx={{ width: { lg: `calc(100% - ${designTokens.layout.drawerWidth}px)` }, ml: { lg: `${designTokens.layout.drawerWidth}px` } }}>
        <Toolbar sx={{ minHeight: designTokens.layout.headerHeight, px: { xs: 1.5, sm: 3 } }}>
          {!isDesktop ? (
            <AppIconButton label="Open navigation menu" onClick={() => setMobileOpen(true)} edge="start" sx={{ mr: 1 }}>
              <MenuOutlinedIcon />
            </AppIconButton>
          ) : null}
          <Box flex={1} minWidth={0}>
            <AppBreadcrumbs />
          </Box>
          <AppIconButton label="Open profile menu" onClick={openProfileMenu}>
            <UserAvatar name={user?.name ?? 'User'} />
          </AppIconButton>
          <Menu anchorEl={menuAnchor} open={menuAnchor !== null} onClose={() => setMenuAnchor(null)}>
            <Box px={2} py={1}>
              <Typography fontWeight={700}>{user?.name}</Typography>
              <Typography variant="body2" color="text.secondary">{user?.email ?? user?.username}</Typography>
            </Box>
            <Divider />
            <MenuItem component={RouterLink} to={paths.changePassword} onClick={() => setMenuAnchor(null)}>
              <ListItemIcon><PasswordOutlinedIcon fontSize="small" /></ListItemIcon>
              Change Password
            </MenuItem>
            <MenuItem onClick={() => void handleLogout()} disabled={isLoggingOut}>
              <ListItemIcon><LogoutOutlinedIcon fontSize="small" /></ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Box component="aside" sx={{ width: { lg: designTokens.layout.drawerWidth }, flexShrink: 0 }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', lg: 'none' },
            '& .MuiDrawer-paper': {
              width: designTokens.layout.drawerWidth,
              maxWidth: 'calc(100vw - 32px)',
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer variant="permanent" open sx={{ display: { xs: 'none', lg: 'block' }, '& .MuiDrawer-paper': { width: designTokens.layout.drawerWidth } }}>
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        id="main-content"
        sx={{
          flex: 1,
          minWidth: 0,
          maxWidth: '100%',
          overflowX: 'hidden',
          pt: `${designTokens.layout.headerHeight + 24}px`,
          px: { xs: 1.5, sm: 3 },
          pb: 4,
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
