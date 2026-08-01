import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';

import { AppBrand } from '@shared/components/brand/AppBrand';
import { PasswordField } from '@shared/components/common/PasswordField';
import { AppButton } from '@shared/ui/actions';
import { paths } from '@app/router/routeConfig';
import { useAuth } from '../hooks/useAuth';
import { loginSchema, type LoginFormValues } from '../model/auth.schema';

type LocationState = {
  from?: { pathname?: string };
};

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, authError, clearAuthError, isLoggingIn, sessionMessage, clearSessionMessage } = useAuth();
  const redirectTo = (location.state as LocationState | null)?.from?.pathname ?? paths.dashboard;
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
  });

  useEffect(() => {
    clearAuthError();
  }, [clearAuthError]);

  async function onSubmit(values: LoginFormValues) {
    clearSessionMessage();
    await login(values);
    form.reset({ identifier: '', password: '' });
    navigate(redirectTo, { replace: true });
  }

  return (
    <Box component="main" minHeight="100vh" display="grid" sx={{ placeItems: 'center', px: 2, py: 4, bgcolor: 'background.default' }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 3, md: 8 }} alignItems="center" width="100%" maxWidth={980}>
        <Stack spacing={2} flex={1} alignItems={{ xs: 'center', md: 'flex-start' }} textAlign={{ xs: 'center', md: 'left' }}>
          <AppBrand />
          <Typography variant="h1" color="secondary.main">Buminex Quotation Management System</Typography>
          <Typography color="text.secondary" maxWidth={420}>Clean, controlled quotation workflows for pharmaceutical and industrial operations.</Typography>
        </Stack>
        <Card sx={{ width: '100%', maxWidth: 420 }}>
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Stack component="form" spacing={2.25} onSubmit={(event) => void form.handleSubmit(onSubmit)(event)} noValidate aria-busy={isLoggingIn}>
              <Box>
                <Typography component="h1" variant="h1">Welcome back</Typography>
                <Typography color="text.secondary">Sign in to manage companies, items and quotations.</Typography>
              </Box>
              {sessionMessage ? <Alert severity="info" onClose={clearSessionMessage}>{sessionMessage}</Alert> : null}
              {authError ? <Alert severity="error">{authError.message}</Alert> : null}
              <Controller
                name="identifier"
                control={form.control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    autoFocus
                    fullWidth
                    label="Email or username"
                    autoComplete="username"
                    error={fieldState.invalid}
                    helperText={fieldState.error?.message}
                    disabled={isLoggingIn}
                  />
                )}
              />
              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <PasswordField
                    {...field}
                    fullWidth
                    label="Password"
                    autoComplete="current-password"
                    error={fieldState.invalid}
                    helperText={fieldState.error?.message}
                    disabled={isLoggingIn}
                  />
                )}
              />
              <AppButton type="submit" variant="contained" size="large" isLoading={isLoggingIn} loadingPosition="start">
                {isLoggingIn ? 'Signing in...' : 'Sign in'}
              </AppButton>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Buminex Pharmtech Solutions Pvt. Ltd.
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
