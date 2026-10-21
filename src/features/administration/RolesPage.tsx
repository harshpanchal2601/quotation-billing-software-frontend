import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
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

import type { Permission } from '@features/auth';
import { toApiError, type ApiFieldErrors } from '@shared/api/apiClient';
import { EmptyState } from '@shared/components/common/EmptyState';
import { ErrorState } from '@shared/components/common/ErrorState';
import { AppButton } from '@shared/ui/actions';
import { AppDialog, ConfirmDialog } from '@shared/ui/dialogs';
import { AppSnackbar } from '@shared/ui/feedback';
import { PageContainer, PageHeader } from '@shared/ui/layout';
import { DataTableShell, TableSkeleton } from '@shared/ui/tables';
import {
  administrationQueryKeys,
  createRoleRequest,
  deleteRoleRequest,
  listAssignablePermissionsRequest,
  listRolesRequest,
  updateRoleRequest,
} from './administration.api';
import type { FirmRole, RoleInput } from './administration.types';

const emptyRole: RoleInput = { name: '', description: '', permissions: [] };

export function RolesPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<FirmRole | null>(null);
  const [form, setForm] = useState<RoleInput>(emptyRole);
  const [deleteTarget, setDeleteTarget] = useState<FirmRole | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ApiFieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const rolesQuery = useQuery({ queryKey: administrationQueryKeys.roles, queryFn: listRolesRequest });
  const permissionsQuery = useQuery({
    queryKey: administrationQueryKeys.permissions,
    queryFn: listAssignablePermissionsRequest,
  });

  const saveMutation = useMutation({
    mutationFn: (input: RoleInput) => editingRole ? updateRoleRequest(editingRole.id, input) : createRoleRequest(input),
    onSuccess: () => {
      const successMessage = editingRole ? 'Role updated. Assigned users must sign in again.' : 'Role created.';
      closeDialog();
      setMessage(successMessage);
      void queryClient.invalidateQueries({ queryKey: administrationQueryKeys.roles });
    },
    onError: handleApiError,
  });
  const deleteMutation = useMutation({
    mutationFn: deleteRoleRequest,
    onSuccess: () => {
      setDeleteTarget(null);
      clearErrors();
      setMessage('Role deleted.');
      void queryClient.invalidateQueries({ queryKey: administrationQueryKeys.roles });
    },
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

  function fieldFeedback(field: string) {
    return {
      error: fieldErrors[field] !== undefined,
      helperText: fieldErrors[field],
    };
  }

  function openCreate() {
    clearErrors();
    setEditingRole(null);
    setForm(emptyRole);
    setDialogOpen(true);
  }
  function openEdit(role: FirmRole) {
    clearErrors();
    setEditingRole(role);
    setForm({ name: role.name, description: role.description, permissions: role.permissions });
    setDialogOpen(true);
  }
  function closeDialog() {
    setDialogOpen(false);
    setEditingRole(null);
    setForm(emptyRole);
    clearErrors();
  }
  function togglePermission(permission: Permission) {
    setForm((current) => ({
      ...current,
      permissions: current.permissions.includes(permission)
        ? current.permissions.filter((item) => item !== permission)
        : [...current.permissions, permission],
    }));
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    clearErrors();
    saveMutation.mutate(form);
  }

  return (
    <PageContainer>
      <PageHeader title="Roles & Access" description="Define which modules and actions are available to firm users." actions={<AppButton variant="contained" startIcon={<AddOutlinedIcon />} onClick={openCreate}>Add Role</AppButton>} />
      <DataTableShell
        isLoading={rolesQuery.isPending}
        isError={rolesQuery.isError}
        isEmpty={rolesQuery.data?.length === 0}
        loadingContent={<TableSkeleton />}
        errorContent={<ErrorState message={toApiError(rolesQuery.error).message} />}
        emptyContent={<EmptyState title="No roles created" description="Create a role before adding basic firm users." />}
      >
        {rolesQuery.data?.length ? (
          <Table aria-label="Firm roles" sx={{ minWidth: 560 }}>
            <TableHead><TableRow><TableCell>Role</TableCell><TableCell>Permissions</TableCell><TableCell>Users</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
            <TableBody>{rolesQuery.data.map((role) => (
              <TableRow key={role.id} hover>
                <TableCell><Typography fontWeight={700}>{role.name}</Typography><Typography variant="caption" color="text.secondary">{role.description || 'No description'}</Typography></TableCell>
                <TableCell>{role.permissions.length}</TableCell>
                <TableCell>{role._count?.users ?? 0}</TableCell>
                <TableCell align="right"><Stack direction="row" spacing={1} justifyContent="flex-end"><AppButton size="small" onClick={() => openEdit(role)}>Edit</AppButton><AppButton size="small" color="error" disabled={(role._count?.users ?? 0) > 0 || role.isSystem} onClick={() => { clearErrors(); setDeleteTarget(role); }}>Delete</AppButton></Stack></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        ) : null}
      </DataTableShell>

      <AppDialog open={dialogOpen} title={editingRole ? 'Edit role' : 'Add role'} onClose={closeDialog} fullWidth maxWidth="sm" preventClose={saveMutation.isPending} actions={<><AppButton onClick={closeDialog} disabled={saveMutation.isPending}>Cancel</AppButton><AppButton type="submit" form="role-form" variant="contained" isLoading={saveMutation.isPending}>Save Role</AppButton></>}>
        <Stack component="form" id="role-form" onSubmit={submit} spacing={2} pt={1}>
          <TextField required label="Role name" value={form.name} onChange={(e) => { clearFieldError('name'); setForm((current) => ({ ...current, name: e.target.value })); }} {...fieldFeedback('name')} />
          <TextField label="Description" multiline minRows={2} value={form.description ?? ''} onChange={(e) => { clearFieldError('description'); setForm((current) => ({ ...current, description: e.target.value })); }} {...fieldFeedback('description')} />
          <Typography variant="subtitle2">Module permissions</Typography>
          {permissionsQuery.isError ? <ErrorState message={toApiError(permissionsQuery.error).message} /> : (
            <FormGroup sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
              {permissionsQuery.data?.map((permission) => (
                <FormControlLabel key={permission} control={<Checkbox checked={form.permissions.includes(permission)} onChange={() => togglePermission(permission)} />} label={permissionLabel(permission)} />
              ))}
            </FormGroup>
          )}
        </Stack>
      </AppDialog>
      <ConfirmDialog open={deleteTarget !== null} title="Delete role?" confirmLabel="Delete" confirmColor="error" isConfirming={deleteMutation.isPending} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}>This role will no longer be available for assignment.</ConfirmDialog>
      <AppSnackbar open={message !== null} message={message ?? ''} onClose={() => setMessage(null)} />
      <AppSnackbar open={error !== null} message={error ?? ''} severity="error" onClose={() => setError(null)} />
    </PageContainer>
  );
}

function permissionLabel(permission: Permission) {
  return permission.split('.').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' · ');
}
