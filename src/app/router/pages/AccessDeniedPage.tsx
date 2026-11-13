import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useNavigate } from 'react-router-dom';

import { getDefaultAuthenticatedPath, useAuth } from '@features/auth';
import { AppButton } from '@shared/ui/actions';
import { PageContainer } from '@shared/ui/layout';
import { paths } from '@shared/routing/paths';

export function AccessDeniedPage() {
  const { user, logout, isLoggingOut } = useAuth();
  const navigate = useNavigate();
  const workspace = user ? getDefaultAuthenticatedPath(user) : paths.login;
  return (
    <PageContainer maxWidth={800} sx={{ mx: 'auto', py: { xs: 4, md: 10 }, width: '100%' }}>
      <Paper variant="outlined" sx={{ p: { xs: 3, sm: 5 }, borderRadius: 3 }}>
        <Stack spacing={3} alignItems="center" textAlign="center">
          <Box sx={{ width: 88, height: 88, borderRadius: '50%', bgcolor: 'action.hover', display: 'grid', placeItems: 'center' }}>
            <LockOutlinedIcon color="primary" sx={{ fontSize: 40 }} />
          </Box>
          <Stack spacing={1.5} alignItems="center">
            <Typography variant="overline" color="text.secondary">403 · Page restricted</Typography>
            <Typography component="h1" variant="h1">Access denied</Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 520 }}>Your account does not have access to this page. Your role or your firm's subscription may not include it.</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 520 }}>If you need this page for your work, ask your firm administrator to review your access.</Typography>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            {workspace !== paths.accessDenied ? <AppButton variant="contained" onClick={() => navigate(workspace, { replace: true })}>Back to workspace</AppButton> : null}
            <AppButton variant="outlined" disabled={isLoggingOut} onClick={() => void logout()}>Sign out</AppButton>
          </Stack>
        </Stack>
      </Paper>
    </PageContainer>
  );
}
