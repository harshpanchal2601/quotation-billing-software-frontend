import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { useAuth } from '@features/auth';
import { AppButton } from '@shared/ui/actions';
import { PageContainer } from '@shared/ui/layout';

export function AccessDeniedPage() {
  const { logout } = useAuth();
  return (
    <PageContainer maxWidth={640} sx={{ mx: 'auto', py: 8, textAlign: 'center', alignItems: 'center' }}>
      <LockOutlinedIcon color="disabled" sx={{ fontSize: 64 }} />
      <Stack spacing={1}>
        <Typography component="h1" variant="h1">No module access</Typography>
        <Typography color="text.secondary">Your firm administrator has not assigned access to this module. Contact them if you need additional permissions.</Typography>
      </Stack>
      <AppButton variant="outlined" onClick={() => void logout()}>Sign out</AppButton>
    </PageContainer>
  );
}
