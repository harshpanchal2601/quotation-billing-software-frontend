import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { toApiError, type ApiFieldErrors } from '@shared/api/apiClient';
import { ErrorState } from '@shared/components/common/ErrorState';
import { paths } from '@shared/routing/paths';
import { AppButton } from '@shared/ui/actions';
import { AppDialog, ConfirmDialog } from '@shared/ui/dialogs';
import { AppStatusChip, formatRecordStatus } from '@shared/ui/display';
import { AppSnackbar } from '@shared/ui/feedback';
import { PageContainer, PageHeader } from '@shared/ui/layout';
import { DataTableShell, RecordTable, TableSkeleton } from '@shared/ui/tables';
import {
  administrationQueryKeys,
  createFirmUserRequest,
  deleteFirmUserRequest,
  listFirmUsersRequest,
  listRolesRequest,
  resetFirmUserPasswordRequest,
  updateFirmUserRequest,
} from './administration.api';
import type { FirmUser, UserCreateInput } from './administration.types';

const emptyUser: UserCreateInput = { name: '', email: '', username: '', roleId: 0, temporaryPassword: '' };
type UserEditForm = { name: string; email: string; username: string; roleId: number };

export function UsersPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<UserCreateInput>(emptyUser);
  const [resetTarget, setResetTarget] = useState<FirmUser | null>(null);
  const [editTarget, setEditTarget] = useState<FirmUser | null>(null);
  const [editForm, setEditForm] = useState<UserEditForm>({ name: '', email: '', username: '', roleId: 0 });
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<FirmUser | null>(null);
  const [statusTarget, setStatusTarget] = useState<FirmUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ApiFieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const usersQuery = useQuery({ queryKey: administrationQueryKeys.users, queryFn: listFirmUsersRequest });
  const rolesQuery = useQuery({ queryKey: administrationQueryKeys.roles, queryFn: listRolesRequest });

  const refreshUsers = () => queryClient.invalidateQueries({ queryKey: administrationQueryKeys.users });
  const createMutation = useMutation({
    mutationFn: createFirmUserRequest,
    onSuccess: () => {
      setCreateOpen(false);
      setForm(emptyUser);
      clearErrors();
      setMessage('User created. They must change the temporary password at first login.');
      void refreshUsers();
    },
    onError: handleApiError,
  });
  const statusMutation = useMutation({
    mutationFn: (user: FirmUser) => updateFirmUserRequest(user.id, { status: user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }),
    onSuccess: () => { setStatusTarget(null); clearErrors(); setMessage('User status updated.'); void refreshUsers(); },
    onError: handleApiError,
  });
  const editMutation = useMutation({
    mutationFn: () => updateFirmUserRequest(editTarget!.id, editForm),
    onSuccess: () => { setEditTarget(null); clearErrors(); setMessage('User details and role updated. Active sessions were revoked if access changed.'); void refreshUsers(); },
    onError: handleApiError,
  });
  const resetMutation = useMutation({
    mutationFn: () => resetFirmUserPasswordRequest(resetTarget!.id, temporaryPassword),
    onSuccess: () => { setResetTarget(null); setTemporaryPassword(''); clearErrors(); setMessage('Temporary password reset. Active sessions were revoked.'); void refreshUsers(); },
    onError: handleApiError,
  });
  const deleteMutation = useMutation({
    mutationFn: deleteFirmUserRequest,
    onSuccess: () => { setDeleteTarget(null); clearErrors(); setMessage('User deleted.'); void refreshUsers(); },
    onError: handleApiError,
  });

  function handleApiError(cause: unknown) {
    const apiError = toApiError(cause);
    setMessage(null);
    setError(apiError.message);
    setFieldErrors(apiError.fieldErrors);
  }

  function clearErrors() {
    setError(null);
    setFieldErrors({});
  }

  function clearFieldError(field: string) {
    setFieldErrors((current) => {
      if (current[field] === undefined) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function fieldFeedback(field: string, defaultHelperText?: string) {
    return {
      error: fieldErrors[field] !== undefined,
      helperText: fieldErrors[field] ?? defaultHelperText,
    };
  }

  function submitCreate(event: FormEvent) {
    event.preventDefault();
    clearErrors();
    createMutation.mutate(form);
  }

  function openCreate() {
    clearErrors();
    setCreateOpen(true);
  }

  function closeCreate() {
    setCreateOpen(false);
    clearErrors();
  }

  function openEdit(user: FirmUser) {
    clearErrors();
    setEditTarget(user);
    setEditForm({
      name: user.name,
      email: user.email,
      username: user.username,
      roleId: user.firmRole?.id ?? 0,
    });
  }

  function closeEdit() {
    setEditTarget(null);
    clearErrors();
  }

  function openReset(user: FirmUser) {
    clearErrors();
    setTemporaryPassword('');
    setResetTarget(user);
  }

  function closeReset() {
    setResetTarget(null);
    setTemporaryPassword('');
    clearErrors();
  }

  const atLimit = usersQuery.data !== undefined && usersQuery.data.userCount >= usersQuery.data.userLimit;

  return (
    <PageContainer>
      <PageHeader
        title="Firm Users"
        description={`Manage the firm administrator and up to ${Math.max(0, (usersQuery.data?.userLimit ?? 4) - 1)} basic user accounts.`}
        actions={<AppButton variant="contained" startIcon={<AddOutlinedIcon />} disabled={atLimit || usersQuery.isPending || usersQuery.isError || rolesQuery.isPending || rolesQuery.isError || rolesQuery.data?.length === 0} onClick={openCreate}>Add User</AppButton>}
      />
      {usersQuery.data ? <Typography color="text.secondary">{usersQuery.data.userCount} of {usersQuery.data.userLimit} accounts in use</Typography> : null}
      {atLimit ? <Alert severity="info">The firm has reached its user limit. Remove an unused account, or review the subscription before adding another user.</Alert> : null}
      {rolesQuery.isError ? <ErrorState message="Roles could not be loaded. Retry before adding or assigning a user." onRetry={() => { void rolesQuery.refetch(); }} /> : null}
      {rolesQuery.isSuccess && rolesQuery.data.length === 0 ? <Alert severity="info" action={<AppButton component={Link} to={paths.firmRoles}>Create role</AppButton>}>Create a role with the required permissions before adding a user.</Alert> : null}
      <DataTableShell
        wrapInTableContainer={false}
        isLoading={usersQuery.isPending}
        isError={usersQuery.isError}
        isEmpty={false}
        loadingContent={<TableSkeleton />}
        errorContent={<ErrorState message={toApiError(usersQuery.error).message} />}
        emptyContent={null}
      >
        <RecordTable rows={usersQuery.data?.users ?? []} label="Firm users" rowKey={(user) => user.id} emptyMessage="No users found." columns={[
          { key: 'name', label: 'User', sortValue: (user) => user.name, render: (user) => <Stack><Typography fontWeight={700}>{user.name}</Typography><Typography variant="caption" color="text.secondary">{user.email}</Typography></Stack> }, { key: 'username', label: 'Username', sortValue: (user) => user.username, render: (user) => user.username },
          { key: 'role', label: 'Role', sortValue: (user) => user.accountType === 'FIRM_ADMIN' ? 'Firm Administrator' : user.firmRole?.name, render: (user) => user.accountType === 'FIRM_ADMIN' ? 'Firm Administrator' : user.firmRole?.name ?? 'Unassigned' },
          { key: 'status', label: 'Status', sortValue: (user) => user.status, render: (user) => <Stack spacing={1}><AppStatusChip label={formatRecordStatus(user.status)} variant={user.status === 'ACTIVE' ? 'success' : 'warning'} />{user.mustChangePassword ? <Typography variant="caption">Password change required</Typography> : null}</Stack> },
          { key: 'actions', label: 'Actions', render: (user) => user.accountType === 'FIRM_USER' ? <Stack direction={{ xs: 'column', sm: 'row' }} useFlexGap flexWrap="wrap" spacing={1}><AppButton size="small" onClick={() => openEdit(user)}>Edit</AppButton><AppButton size="small" onClick={() => openReset(user)}>Reset Password</AppButton><AppButton size="small" color={user.status === 'ACTIVE' ? 'warning' : 'success'} onClick={() => { clearErrors(); setStatusTarget(user); }}>{user.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</AppButton><AppButton size="small" color="error" onClick={() => { clearErrors(); setDeleteTarget(user); }}>Delete</AppButton></Stack> : '—' },
        ]} />
      </DataTableShell>

      <AppDialog open={createOpen} title="Add firm user" onClose={closeCreate} fullWidth maxWidth="sm" preventClose={createMutation.isPending} actions={<><AppButton onClick={closeCreate} disabled={createMutation.isPending}>Cancel</AppButton><AppButton type="submit" form="create-user-form" variant="contained" isLoading={createMutation.isPending}>Create User</AppButton></>}>
        <Stack component="form" id="create-user-form" autoComplete="off" onSubmit={submitCreate} spacing={2} pt={1}>
          <TextField required label="Full name" value={form.name} onChange={(e) => { clearFieldError('name'); setForm((current) => ({ ...current, name: e.target.value })); }} {...fieldFeedback('name')} />
          <TextField required type="email" label="Email" value={form.email} onChange={(e) => { clearFieldError('email'); setForm((current) => ({ ...current, email: e.target.value })); }} {...fieldFeedback('email')} />
          <TextField required autoComplete="off" label="Username" value={form.username} onChange={(e) => { clearFieldError('username'); setForm((current) => ({ ...current, username: e.target.value })); }} {...fieldFeedback('username', 'Letters, numbers, spaces, dots, underscores and hyphens are allowed')} />
          <TextField required select label="Role" value={form.roleId || ''} onChange={(e) => { clearFieldError('roleId'); setForm((current) => ({ ...current, roleId: Number(e.target.value) })); }} {...fieldFeedback('roleId')}>
            {rolesQuery.data?.map((role) => <MenuItem key={role.id} value={role.id}>{role.name}</MenuItem>)}
          </TextField>
          <TextField required autoComplete="new-password" type="password" label="Temporary password" value={form.temporaryPassword} onChange={(e) => { clearFieldError('temporaryPassword'); setForm((current) => ({ ...current, temporaryPassword: e.target.value })); }} {...fieldFeedback('temporaryPassword', '10+ characters with upper/lowercase, number and symbol')} />
        </Stack>
      </AppDialog>

      <AppDialog open={editTarget !== null} title="Edit firm user" onClose={closeEdit} fullWidth maxWidth="sm" preventClose={editMutation.isPending} actions={<><AppButton onClick={closeEdit} disabled={editMutation.isPending}>Cancel</AppButton><AppButton variant="contained" isLoading={editMutation.isPending} onClick={() => editMutation.mutate()}>Save Changes</AppButton></>}>
        <Stack spacing={2} pt={1}>
          <TextField required label="Full name" value={editForm.name} onChange={(e) => { clearFieldError('name'); setEditForm((current) => ({ ...current, name: e.target.value })); }} {...fieldFeedback('name')} />
          <TextField required type="email" label="Email" value={editForm.email} onChange={(e) => { clearFieldError('email'); setEditForm((current) => ({ ...current, email: e.target.value })); }} {...fieldFeedback('email')} />
          <TextField required label="Username" value={editForm.username} onChange={(e) => { clearFieldError('username'); setEditForm((current) => ({ ...current, username: e.target.value })); }} {...fieldFeedback('username', 'Letters, numbers, spaces, dots, underscores and hyphens are allowed')} />
          <TextField required select label="Role" value={editForm.roleId || ''} onChange={(e) => { clearFieldError('roleId'); setEditForm((current) => ({ ...current, roleId: Number(e.target.value) })); }} {...fieldFeedback('roleId')}>
            {rolesQuery.data?.map((role) => <MenuItem key={role.id} value={role.id}>{role.name}</MenuItem>)}
          </TextField>
        </Stack>
      </AppDialog>

      <AppDialog open={resetTarget !== null} title="Reset temporary password" onClose={closeReset} fullWidth maxWidth="xs" preventClose={resetMutation.isPending} actions={<><AppButton onClick={closeReset} disabled={resetMutation.isPending}>Cancel</AppButton><AppButton variant="contained" disabled={temporaryPassword.length < 10} isLoading={resetMutation.isPending} onClick={() => resetMutation.mutate()}>Reset Password</AppButton></>}>
        <Stack spacing={2} pt={1}><Typography color="text.secondary">{resetTarget?.name} will be signed out and required to change this password.</Typography><TextField autoFocus required autoComplete="new-password" type="password" label="Temporary password" value={temporaryPassword} onChange={(e) => { clearFieldError('temporaryPassword'); setTemporaryPassword(e.target.value); }} {...fieldFeedback('temporaryPassword')} /></Stack>
      </AppDialog>
      <ConfirmDialog open={statusTarget !== null} title={statusTarget?.status === 'ACTIVE' ? 'Deactivate user?' : 'Activate user?'} confirmLabel={statusTarget?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} confirmColor={statusTarget?.status === 'ACTIVE' ? 'warning' : 'success'} isConfirming={statusMutation.isPending} onClose={() => setStatusTarget(null)} onConfirm={() => statusTarget && statusMutation.mutate(statusTarget)}>Changing status revokes this user's active sessions.</ConfirmDialog>
      <ConfirmDialog open={deleteTarget !== null} title="Delete user?" confirmLabel="Delete" confirmColor="error" isConfirming={deleteMutation.isPending} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}>The user will lose access immediately. Existing business records remain unchanged.</ConfirmDialog>
      <AppSnackbar open={message !== null} message={message ?? ''} onClose={() => setMessage(null)} />
      <AppSnackbar open={error !== null} message={error ?? ''} severity="error" onClose={() => setError(null)} />
    </PageContainer>
  );
}
