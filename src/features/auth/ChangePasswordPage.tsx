import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { PasswordField } from '../../components/common/PasswordField';
import { paths } from '../../routes/routeConfig';
import { useAuth } from './auth.hooks';
import { changePasswordSchema, type ChangePasswordFormValues } from './auth.schemas';

const requirements = [
  '10 to 72 characters',
  'At least one uppercase letter',
  'At least one lowercase letter',
  'At least one number',
  'At least one special character',
  'No leading or trailing spaces',
];

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const { changePassword, authError, isChangingPassword } = useAuth();
  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  async function onSubmit(values: ChangePasswordFormValues) {
    await changePassword(values);
    form.reset();
    navigate(paths.login, { replace: true, state: { message: 'Password changed successfully. Please log in again.' } });
  }

  return (
    <Stack spacing={3} maxWidth={760}>
      <Box>
        <Typography component="h1" variant="h1">Change Password</Typography>
        <Typography color="text.secondary">Update your administrator password. You will need to sign in again.</Typography>
      </Box>
      <Card>
        <CardContent>
          <Stack component="form" spacing={2.25} onSubmit={(event) => void form.handleSubmit(onSubmit)(event)} noValidate>
            {authError ? <Alert severity="error">{authError.message}</Alert> : null}
            <Controller name="currentPassword" control={form.control} render={({ field, fieldState }) => (
              <PasswordField {...field} fullWidth label="Current password" autoComplete="current-password" error={fieldState.invalid} helperText={fieldState.error?.message} />
            )} />
            <Controller name="newPassword" control={form.control} render={({ field, fieldState }) => (
              <PasswordField {...field} fullWidth label="New password" autoComplete="new-password" error={fieldState.invalid} helperText={fieldState.error?.message} />
            )} />
            <Controller name="confirmPassword" control={form.control} render={({ field, fieldState }) => (
              <PasswordField {...field} fullWidth label="Confirm new password" autoComplete="new-password" error={fieldState.invalid} helperText={fieldState.error?.message} />
            )} />
            <Box bgcolor="primary.light" borderRadius={2} p={2}>
              <Typography fontWeight={700}>Password requirements</Typography>
              <List dense>
                {requirements.map((item) => <ListItem key={item} disableGutters><ListItemText primary={item} /></ListItem>)}
              </List>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button type="submit" variant="contained" disabled={isChangingPassword}>{isChangingPassword ? 'Changing password' : 'Change password'}</Button>
              <Button variant="outlined" onClick={() => navigate(paths.dashboard)}>Cancel</Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
