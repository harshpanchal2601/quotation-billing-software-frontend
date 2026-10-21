import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { toApiError, type ApiFieldErrors } from '@shared/api/apiClient';
import { EmptyState } from '@shared/components/common/EmptyState';
import { ErrorState } from '@shared/components/common/ErrorState';
import { setSelectedFirm } from '@shared/tenancy/selectedFirm';
import { AppButton } from '@shared/ui/actions';
import { AppDialog, ConfirmDialog } from '@shared/ui/dialogs';
import { AppStatusChip } from '@shared/ui/display';
import { AppSnackbar } from '@shared/ui/feedback';
import { PageContainer, PageHeader } from '@shared/ui/layout';
import { DataTableShell, TableSkeleton } from '@shared/ui/tables';
import { paths } from '@shared/routing/paths';
import {
  createPlatformFirmRequest,
  listPlatformFirmsRequest,
  platformFirmQueryKey,
  updatePlatformFirmStatusRequest,
  updatePlatformFirmRequest,
  resetPlatformFirmAdministratorPasswordRequest,
} from './platform.api';
import type { CreateFirmInput, PlatformFirm } from './platform.types';

const emptyForm: CreateFirmInput = {
  name: '', slug: '', legalName: '', displayName: '', addressLine1: '', addressLine2: '',
  city: '', state: '', postalCode: '', country: 'India', primaryEmail: '', primaryPhone: '',
  quotationPrefix: '', adminName: '', adminEmail: '', adminUsername: '', temporaryPassword: '',
};

export function PlatformFirmsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<CreateFirmInput>(emptyForm);
  const [statusTarget, setStatusTarget] = useState<PlatformFirm | null>(null);
  const [editTarget, setEditTarget] = useState<PlatformFirm | null>(null);
  const [editForm, setEditForm] = useState({ name: '', slug: '' });
  const [resetTarget, setResetTarget] = useState<PlatformFirm | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ApiFieldErrors>({});
  const query = useQuery({ queryKey: platformFirmQueryKey, queryFn: listPlatformFirmsRequest });

  const createMutation = useMutation({
    mutationFn: createPlatformFirmRequest,
    onSuccess: (firm) => {
      setFormOpen(false);
      setForm(emptyForm);
      setFieldErrors({});
      setError(null);
      setMessage(`${firm.name} was created. The administrator must change the temporary password.`);
      void queryClient.invalidateQueries({ queryKey: platformFirmQueryKey });
    },
    onError: handleApiError,
  });
  const statusMutation = useMutation({
    mutationFn: (firm: PlatformFirm) =>
      updatePlatformFirmStatusRequest(firm.id, firm.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'),
    onSuccess: () => {
      setStatusTarget(null);
      setError(null);
      setMessage('Firm status updated.');
      void queryClient.invalidateQueries({ queryKey: platformFirmQueryKey });
    },
    onError: handleApiError,
  });
  const resetMutation = useMutation({
    mutationFn: () => resetPlatformFirmAdministratorPasswordRequest(resetTarget!.id, temporaryPassword),
    onSuccess: () => {
      setResetTarget(null);
      setTemporaryPassword('');
      setFieldErrors({});
      setError(null);
      setMessage('Firm administrator password reset. Existing sessions were revoked.');
    },
    onError: handleApiError,
  });
  const editMutation = useMutation({
    mutationFn: () => updatePlatformFirmRequest(editTarget!.id, editForm),
    onSuccess: () => {
      setEditTarget(null);
      setFieldErrors({});
      setError(null);
      setMessage('Firm updated.');
      void queryClient.invalidateQueries({ queryKey: platformFirmQueryKey });
    },
    onError: handleApiError,
  });

  function updateField(field: keyof CreateFirmInput, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    clearFieldError(field);
  }

  function handleApiError(cause: unknown) {
    const apiError = toApiError(cause);
    setMessage(null);
    setError(apiError.message);
    setFieldErrors(apiError.fieldErrors);
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

  function openCreateForm() {
    setError(null);
    setFieldErrors({});
    setFormOpen(true);
  }

  function closeCreateForm() {
    setFormOpen(false);
    setError(null);
    setFieldErrors({});
  }

  function selectFirm(firm: PlatformFirm) {
    setSelectedFirm({ id: firm.id, name: firm.displayName || firm.name });
    queryClient.removeQueries({
      predicate: (entry) => entry.queryKey[0] !== 'auth' && entry.queryKey[0] !== 'platform',
    });
    navigate(paths.dashboard);
  }

  function openEdit(firm: PlatformFirm) {
    setError(null);
    setFieldErrors({});
    setEditTarget(firm);
    setEditForm({ name: firm.name, slug: firm.slug });
  }

  function closeEdit() {
    setEditTarget(null);
    setError(null);
    setFieldErrors({});
  }

  function openReset(firm: PlatformFirm) {
    setError(null);
    setFieldErrors({});
    setTemporaryPassword('');
    setResetTarget(firm);
  }

  function closeReset() {
    setResetTarget(null);
    setTemporaryPassword('');
    setError(null);
    setFieldErrors({});
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    const payload = Object.fromEntries(
      Object.entries(form).filter(([, value]) => typeof value !== 'string' || value.trim() !== ''),
    ) as unknown as CreateFirmInput;
    createMutation.mutate(payload);
  }

  return (
    <PageContainer>
      <PageHeader
        title="Firms"
        description="Register client firms, issue their administrator account, and enter a firm workspace."
        actions={<AppButton variant="contained" startIcon={<AddOutlinedIcon />} onClick={openCreateForm}>Register Firm</AppButton>}
      />
      <DataTableShell
        isLoading={query.isPending}
        isError={query.isError}
        isEmpty={query.data?.firms.length === 0}
        loadingContent={<TableSkeleton />}
        errorContent={<ErrorState message={toApiError(query.error).message} />}
        emptyContent={<EmptyState title="No firms registered" description="Register the first client firm to create its workspace and administrator." />}
      >
        {query.data?.firms.length ? (
          <Table>
            <TableHead><TableRow><TableCell>Firm</TableCell><TableCell>Administrator email</TableCell><TableCell>Users</TableCell><TableCell>Status</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
            <TableBody>
              {query.data.firms.map((firm) => (
                <TableRow key={firm.id} hover>
                  <TableCell><Typography fontWeight={700}>{firm.displayName}</Typography><Typography variant="caption" color="text.secondary">{firm.slug}</Typography></TableCell>
                  <TableCell>{firm.administratorEmail ?? '—'}</TableCell>
                  <TableCell>{firm.userCount} / {firm.userLimit}</TableCell>
                  <TableCell><AppStatusChip label={firm.status} variant={firm.status === 'ACTIVE' ? 'success' : 'warning'} /></TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <AppButton size="small" startIcon={<BusinessOutlinedIcon />} disabled={firm.status !== 'ACTIVE'} onClick={() => selectFirm(firm)}>Open</AppButton>
                      <AppButton size="small" onClick={() => openEdit(firm)}>Edit</AppButton>
                      <AppButton size="small" onClick={() => openReset(firm)}>Reset Admin</AppButton>
                      <AppButton size="small" color={firm.status === 'ACTIVE' ? 'warning' : 'success'} onClick={() => { setError(null); setFieldErrors({}); setStatusTarget(firm); }}>{firm.status === 'ACTIVE' ? 'Suspend' : 'Activate'}</AppButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </DataTableShell>

      <AppDialog
        open={formOpen}
        title="Register firm"
        onClose={closeCreateForm}
        fullWidth
        maxWidth="md"
        preventClose={createMutation.isPending}
        actions={<><AppButton onClick={closeCreateForm} disabled={createMutation.isPending}>Cancel</AppButton><AppButton type="submit" form="create-firm-form" variant="contained" isLoading={createMutation.isPending}>Create Firm</AppButton></>}
      >
        <Stack component="form" id="create-firm-form" onSubmit={submit} spacing={2} pt={1}>
          <Typography variant="subtitle2">Firm identity</Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField required fullWidth label="Firm name" value={form.name} onChange={(e) => updateField('name', e.target.value)} {...fieldFeedback('name')} />
            <TextField required fullWidth label="Slug" value={form.slug} onChange={(e) => updateField('slug', e.target.value.toLowerCase())} {...fieldFeedback('slug', 'Lowercase letters, numbers and hyphens')} />
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField required fullWidth label="Legal name" value={form.legalName} onChange={(e) => updateField('legalName', e.target.value)} {...fieldFeedback('legalName')} />
            <TextField required fullWidth label="Display name" value={form.displayName} onChange={(e) => updateField('displayName', e.target.value)} {...fieldFeedback('displayName')} />
          </Stack>
          <TextField required fullWidth label="Address" value={form.addressLine1} onChange={(e) => updateField('addressLine1', e.target.value)} {...fieldFeedback('addressLine1')} />
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField required fullWidth label="City" value={form.city} onChange={(e) => updateField('city', e.target.value)} {...fieldFeedback('city')} />
            <TextField required fullWidth label="State" value={form.state} onChange={(e) => updateField('state', e.target.value)} {...fieldFeedback('state')} />
            <TextField required fullWidth label="Postal code" value={form.postalCode} onChange={(e) => updateField('postalCode', e.target.value)} {...fieldFeedback('postalCode')} />
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField required fullWidth type="email" label="Firm email" value={form.primaryEmail} onChange={(e) => updateField('primaryEmail', e.target.value)} {...fieldFeedback('primaryEmail')} />
            <TextField fullWidth label="Firm phone" value={form.primaryPhone} onChange={(e) => updateField('primaryPhone', e.target.value)} {...fieldFeedback('primaryPhone')} />
            <TextField fullWidth label="Quotation prefix" value={form.quotationPrefix} onChange={(e) => updateField('quotationPrefix', e.target.value.toUpperCase())} {...fieldFeedback('quotationPrefix')} />
          </Stack>
          <Typography variant="subtitle2" pt={1}>Firm administrator</Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField required fullWidth label="Administrator name" value={form.adminName} onChange={(e) => updateField('adminName', e.target.value)} {...fieldFeedback('adminName')} />
            <TextField required fullWidth type="email" label="Administrator email" value={form.adminEmail} onChange={(e) => updateField('adminEmail', e.target.value)} {...fieldFeedback('adminEmail')} />
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField required fullWidth label="Administrator username" value={form.adminUsername} onChange={(e) => updateField('adminUsername', e.target.value)} {...fieldFeedback('adminUsername', 'Letters, numbers and spaces are allowed')} />
            <TextField required fullWidth type="password" label="Temporary password" value={form.temporaryPassword} onChange={(e) => updateField('temporaryPassword', e.target.value)} {...fieldFeedback('temporaryPassword', '10+ characters with upper/lowercase, number and symbol')} />
          </Stack>
        </Stack>
      </AppDialog>

      <AppDialog open={editTarget !== null} title="Edit firm" onClose={closeEdit} fullWidth maxWidth="xs" preventClose={editMutation.isPending} actions={<><AppButton onClick={closeEdit} disabled={editMutation.isPending}>Cancel</AppButton><AppButton variant="contained" disabled={!editForm.name.trim() || !editForm.slug.trim()} isLoading={editMutation.isPending} onClick={() => editMutation.mutate()}>Save Changes</AppButton></>}>
        <Stack spacing={2} pt={1}><TextField required label="Firm name" value={editForm.name} onChange={(event) => { clearFieldError('name'); setEditForm((current) => ({ ...current, name: event.target.value })); }} {...fieldFeedback('name')} /><TextField required label="Slug" value={editForm.slug} onChange={(event) => { clearFieldError('slug'); setEditForm((current) => ({ ...current, slug: event.target.value.toLowerCase() })); }} {...fieldFeedback('slug', 'Lowercase letters, numbers and hyphens')} /></Stack>
      </AppDialog>

      <ConfirmDialog
        open={statusTarget !== null}
        title={statusTarget?.status === 'ACTIVE' ? 'Suspend firm?' : 'Activate firm?'}
        confirmLabel={statusTarget?.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
        confirmColor={statusTarget?.status === 'ACTIVE' ? 'warning' : 'success'}
        isConfirming={statusMutation.isPending}
        onClose={() => setStatusTarget(null)}
        onConfirm={() => statusTarget && statusMutation.mutate(statusTarget)}
      >
        {statusTarget?.status === 'ACTIVE'
          ? 'All active sessions for this firm will be revoked immediately.'
          : 'Firm users will be able to sign in again.'}
      </ConfirmDialog>
      <AppDialog open={resetTarget !== null} title="Reset firm administrator password" onClose={closeReset} fullWidth maxWidth="xs" preventClose={resetMutation.isPending} actions={<><AppButton onClick={closeReset} disabled={resetMutation.isPending}>Cancel</AppButton><AppButton variant="contained" disabled={temporaryPassword.length < 10} isLoading={resetMutation.isPending} onClick={() => resetMutation.mutate()}>Reset Password</AppButton></>}>
        <Stack spacing={2} pt={1}><Typography color="text.secondary">The administrator for {resetTarget?.displayName} will be signed out and required to change this password.</Typography><TextField autoFocus required type="password" label="Temporary password" value={temporaryPassword} onChange={(event) => { clearFieldError('temporaryPassword'); setTemporaryPassword(event.target.value); }} {...fieldFeedback('temporaryPassword')} /></Stack>
      </AppDialog>
      <AppSnackbar open={message !== null} message={message ?? ''} onClose={() => setMessage(null)} />
      <AppSnackbar open={error !== null} message={error ?? ''} severity="error" onClose={() => setError(null)} />
    </PageContainer>
  );
}
