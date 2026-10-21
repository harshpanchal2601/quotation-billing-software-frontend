import { zodResolver } from '@hookform/resolvers/zod';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';

import { toApiError } from '@shared/api/apiClient';
import { AppBrand } from '@shared/components/brand/AppBrand';
import { productBrand } from '@shared/components/brand/brand';
import { PasswordField } from '@shared/components/common/PasswordField';
import { ControlledTextField } from '@shared/forms/controlled';
import { AppButton } from '@shared/ui/actions';
import { AppSnackbar, ServerErrorAlert } from '@shared/ui/feedback';
import { paths } from '@shared/routing/paths';
import { getDefaultAuthenticatedPath } from '../model/auth-routing';
import { useAuth } from '../hooks/useAuth';
import { loginSchema, type LoginFormValues } from '../model/auth.schema';

type LocationState = {
  from?: { pathname?: string };
};

const workspaceFeatures = [
  { icon: BusinessOutlinedIcon, title: 'Company directory', description: 'Keep customer details close at hand.' },
  { icon: Inventory2OutlinedIcon, title: 'Item catalogue', description: 'Keep your products and pricing organised.' },
  { icon: DescriptionOutlinedIcon, title: 'Professional quotations', description: 'Prepare and manage quotes with clarity.' },
];

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, authError, clearAuthError, isLoggingIn, sessionMessage, clearSessionMessage } = useAuth();
  const [isErrorToastOpen, setIsErrorToastOpen] = useState(false);
  const logoUrl = new URL(productBrand.logoPath, window.location.origin).href;
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
  });

  useEffect(() => {
    clearAuthError();
  }, [clearAuthError]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = `Sign in | ${productBrand.name}`;
    return () => { document.title = previousTitle; };
  }, []);

  async function onSubmit(values: LoginFormValues) {
    clearAuthError();
    clearSessionMessage();
    setIsErrorToastOpen(false);
    form.clearErrors();

    const user = await login(values).catch((error: unknown) => {
      const apiError = toApiError(error);
      for (const field of ['identifier', 'password'] as const) {
        const message = apiError.fieldErrors[field];
        if (message) form.setError(field, { type: 'server', message });
      }
      setIsErrorToastOpen(!apiError.cancelled);
      return null;
    });
    if (user === null) return;
    form.reset({ identifier: '', password: '' });
    const requestedPath = (location.state as LocationState | null)?.from?.pathname;
    const destination = user.mustChangePassword
      ? paths.changePassword
      : requestedPath ?? getDefaultAuthenticatedPath(user);
    navigate(destination, { replace: true });
  }

  return (
    <Box
      component="main"
      sx={{
        minHeight: '100svh', display: 'grid', placeItems: 'center',
        bgcolor: '#F3F5F2', p: { xs: 2, sm: 4, lg: 6 },
      }}
    >
      <Box
        sx={{
          display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: '1fr 1fr' },
          width: '100%', maxWidth: 1120, minHeight: { md: 680 },
          bgcolor: 'background.paper', borderRadius: { xs: 3, sm: 5 }, overflow: 'hidden',
          border: '1px solid', borderColor: 'divider', boxShadow: '0 24px 80px rgba(16, 46, 42, 0.07)',
        }}
      >
        <Stack
          component="section"
          aria-label={`About ${productBrand.name}`}
          sx={{
            position: 'relative', overflow: 'hidden', justifyContent: 'space-between',
            p: { xs: 3, sm: 4, md: 6 }, gap: { xs: 3, md: 6 },
            bgcolor: '#102E2A', color: '#FFFFFF',
            backgroundImage: 'radial-gradient(ellipse at 100% 100%, rgba(91, 157, 115, 0.25), transparent 65%)',
            '&::after': {
              content: '""', position: 'absolute', width: 300, height: 300, borderRadius: '50%',
              border: '1px solid rgba(182, 232, 200, 0.1)', right: -180, top: 80, pointerEvents: 'none',
            },
          }}
        >
          <Box sx={{ '& .MuiTypography-h4': { color: '#FFFFFF', fontSize: 24, fontWeight: 700, letterSpacing: '-0.7px' }, '& .MuiTypography-body2': { color: '#B5CCC2' } }}>
            <AppBrand logoUrl={logoUrl} />
          </Box>
          <Box>
            <Typography sx={{ display: { xs: 'none', md: 'block' }, color: '#B6E8C8', fontSize: 11, fontWeight: 700, letterSpacing: '2px', mb: 2 }}>
              YOUR QUOTATION WORKSPACE
            </Typography>
            <Typography component="h2" sx={{ display: { xs: 'none', md: 'block' }, fontSize: 50, fontWeight: 600, lineHeight: 1.12, letterSpacing: '-1.5px', maxWidth: 420 }}>
              Every detail.<br />Every quote.<br /><Box component="span" sx={{ color: '#B6E8C8' }}>In one place.</Box>
            </Typography>
            <Typography component="p" sx={{ display: { xs: 'block', md: 'none' }, fontSize: 25, fontWeight: 600, lineHeight: 1.25, letterSpacing: '-0.7px', color: '#B6E8C8' }}>
              Every quote. In one place.
            </Typography>
            <Typography sx={{ display: { xs: 'none', md: 'block' }, color: '#C0D1C9', fontSize: 16, lineHeight: 1.75, mt: 2.5, maxWidth: 360 }}>
              Bring your companies, items and quotations together. Spend less time organising and more time moving business forward.
            </Typography>
          </Box>
          <Stack spacing={2.5} sx={{ display: { xs: 'none', md: 'flex' } }}>
            {workspaceFeatures.map(({ icon: Icon, title, description }) => (
              <Stack key={title} direction="row" spacing={2} alignItems="center">
                <Box sx={{ display: 'grid', placeItems: 'center', width: 40, height: 40, flexShrink: 0, border: '1px solid rgba(182, 232, 200, 0.2)', borderRadius: 2, color: '#B6E8C8' }}>
                  <Icon fontSize="small" />
                </Box>
                <Box>
                  <Typography fontWeight={600}>{title}</Typography>
                  <Typography variant="body2" sx={{ color: '#B5CCC2' }}>{description}</Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        </Stack>

        <Stack component="section" aria-labelledby="login-heading" justifyContent="center" sx={{ p: { xs: 3, sm: 5, md: 6 }, minWidth: 0 }}>
            <Stack component="form" spacing={3} onSubmit={(event) => void form.handleSubmit(onSubmit)(event)} noValidate aria-busy={isLoggingIn} sx={{ width: '100%', maxWidth: 380, mx: 'auto', '& .MuiInputBase-input': { fontSize: { xs: 16, sm: 14 } } }}>
              <Box>
                <Typography sx={{ color: 'primary.dark', fontSize: 11, fontWeight: 700, letterSpacing: '1.8px', mb: 1.5 }}>LET’S GET TO WORK</Typography>
                <Typography id="login-heading" component="h1" sx={{ fontSize: { xs: 28, md: 34 }, fontWeight: 700, letterSpacing: '-1px', lineHeight: 1.2, mb: 1.5 }}>Welcome back</Typography>
                <Typography color="text.secondary">Sign in to your {productBrand.name} workspace to pick up where you left off.</Typography>
              </Box>
              {sessionMessage ? <Alert severity="info" onClose={clearSessionMessage}>{sessionMessage}</Alert> : null}
              <ServerErrorAlert message={authError?.message} />
              <ControlledTextField
                name="identifier"
                control={form.control}
                label="Email or username"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                size="medium"
                disabled={isLoggingIn}
                inputProps={{ maxLength: 191 }}
              />
              <Controller
                name="password"
                control={form.control}
                render={({ field: { ref, ...field }, fieldState }) => (
                  <PasswordField
                    {...field}
                    inputRef={ref}
                    fullWidth
                    label="Password"
                    autoComplete="current-password"
                    size="medium"
                    error={fieldState.invalid}
                    helperText={fieldState.error?.message}
                    disabled={isLoggingIn}
                  />
                )}
              />
              <AppButton type="submit" variant="contained" size="large" isLoading={isLoggingIn} loadingPosition="start" endIcon={!isLoggingIn ? <ArrowForwardRoundedIcon /> : undefined} sx={{ minHeight: 52 }}>
                {isLoggingIn ? 'Signing in...' : 'Sign in'}
              </AppButton>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Need access? Contact your administrator.
              </Typography>
              <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="center" sx={{ pt: 2, borderTop: '1px solid', borderColor: 'divider', color: 'text.secondary' }}>
                <LockOutlinedIcon sx={{ fontSize: 15 }} />
                <Typography variant="body2">Your workspace. Securely connected.</Typography>
              </Stack>
            </Stack>
        </Stack>
      </Box>
      <AppSnackbar
        open={isErrorToastOpen && authError !== null}
        message={authError?.message}
        severity="error"
        autoHideDuration={6000}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        onClose={() => setIsErrorToastOpen(false)}
      />
    </Box>
  );
}
