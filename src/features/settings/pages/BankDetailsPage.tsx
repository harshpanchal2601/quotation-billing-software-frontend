import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type PropsWithChildren } from 'react';

import { EmptyState } from '@shared/components/common/EmptyState';
import { ErrorState } from '@shared/components/common/ErrorState';
import { RefreshIndicator } from '@shared/components/common/RefreshIndicator';
import { toApiError, type ApiFieldErrors } from '@shared/api/apiClient';
import { AppButton } from '@shared/ui/actions';
import {
  bankDetailsQueryKey,
  createBankDetailRequest,
  deleteBankDetailRequest,
  listBankDetailsRequest,
  setDefaultBankDetailRequest,
  updateBankDetailRequest,
} from '../api/bank-details.api';
import { BankDeleteDialog } from '../components/BankDeleteDialog';
import { BankDetailsDialog } from '../components/BankDetailsDialog';
import { BankDetailsTable } from '../components/BankDetailsTable';
import type { BankDetailsSubmitValues } from '../schemas/bank-details.schema';
import type { BankDetail } from '../settings.types';

export function BankDetailsPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBankDetail, setEditingBankDetail] = useState<BankDetail | null>(null);
  const [deletingBankDetail, setDeletingBankDetail] = useState<BankDetail | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [dialogFieldErrors, setDialogFieldErrors] = useState<ApiFieldErrors>({});
  const [pageError, setPageError] = useState<string | null>(null);

  const query = useQuery({ queryKey: bankDetailsQueryKey, queryFn: listBankDetailsRequest });

  const createMutation = useMutation({
    mutationFn: createBankDetailRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bankDetailsQueryKey });
      closeDialog();
      setSuccessMessage('Bank account added.');
    },
    onError: setDialogApiError,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: number; values: BankDetailsSubmitValues }) => updateBankDetailRequest(id, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bankDetailsQueryKey });
      closeDialog();
      setSuccessMessage('Bank account saved.');
    },
    onError: setDialogApiError,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBankDetailRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bankDetailsQueryKey });
      setDeletingBankDetail(null);
      setSuccessMessage('Bank account deleted.');
    },
    onError: (error) => setPageError(toApiError(error).message),
  });

  const defaultMutation = useMutation({
    mutationFn: setDefaultBankDetailRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bankDetailsQueryKey });
      setSuccessMessage('Default bank account updated.');
    },
    onError: (error) => setPageError(toApiError(error).message),
  });

  function openAddDialog() {
    setEditingBankDetail(null);
    setDialogError(null);
    setDialogFieldErrors({});
    setDialogOpen(true);
  }

  function openEditDialog(bankDetail: BankDetail) {
    setEditingBankDetail(bankDetail);
    setDialogError(null);
    setDialogFieldErrors({});
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingBankDetail(null);
    setDialogError(null);
    setDialogFieldErrors({});
  }

  function setDialogApiError(error: unknown) {
    const apiError = toApiError(error);
    setDialogError(apiError.message);
    setDialogFieldErrors(apiError.fieldErrors);
  }

  async function handleDialogSubmit(values: BankDetailsSubmitValues) {
    setDialogError(null);
    setDialogFieldErrors({});
    if (editingBankDetail === null) {
      await createMutation.mutateAsync(values);
      return;
    }
    await updateMutation.mutateAsync({ id: editingBankDetail.id, values });
  }

  if (query.isPending) {
    return (
      <SettingsPageShell title="Bank Details" description="Manage bank accounts shown on quotation documents.">
        <Stack spacing={1.5}>{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} height={64} />)}</Stack>
      </SettingsPageShell>
    );
  }

  if (query.isError) {
    return (
      <SettingsPageShell title="Bank Details" description="Manage bank accounts shown on quotation documents.">
        <ErrorState message={toApiError(query.error).message} />
        <AppButton onClick={() => void query.refetch()} variant="outlined">Retry</AppButton>
      </SettingsPageShell>
    );
  }

  const busyBankDetailId = defaultMutation.isPending
    ? defaultMutation.variables
    : deleteMutation.isPending
      ? deleteMutation.variables
      : null;
  const showRefreshing = query.isFetching && !query.isPending;
  const bankDetails = query.data;

  return (
    <SettingsPageShell title="Bank Details" description="Manage bank accounts shown on quotation documents.">
      <Stack spacing={2}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }}>
          <Box>
            <Typography component="h2" variant="h3">Accounts</Typography>
            <Typography color="text.secondary">Only one active account can be marked as the default.</Typography>
          </Box>
          <AppButton variant="contained" startIcon={<AddOutlinedIcon />} onClick={openAddDialog}>Add Bank Account</AppButton>
        </Stack>
        {pageError ? <Alert severity="error" onClose={() => setPageError(null)}>{pageError}</Alert> : null}
        <RefreshIndicator show={showRefreshing} />
        <Box aria-busy={query.isPending || showRefreshing}>
        {bankDetails.length === 0 ? (
          <EmptyState title="No bank accounts yet" description="Add a bank account to make payment details available for quotations." />
        ) : (
          <BankDetailsTable
            bankDetails={bankDetails}
            onEdit={openEditDialog}
            onDelete={setDeletingBankDetail}
            onSetDefault={(bankDetail) => void defaultMutation.mutateAsync(bankDetail.id)}
            busyBankDetailId={busyBankDetailId}
          />
        )}
        </Box>
      </Stack>
      <BankDetailsDialog
        open={dialogOpen}
        bankDetail={editingBankDetail}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        errorMessage={dialogError}
        fieldErrors={dialogFieldErrors}
        onClose={closeDialog}
        onSubmit={handleDialogSubmit}
      />
      <BankDeleteDialog
        bankDetail={deletingBankDetail}
        isDeleting={deleteMutation.isPending}
        onClose={() => setDeletingBankDetail(null)}
        onConfirm={async () => {
          if (deletingBankDetail !== null) await deleteMutation.mutateAsync(deletingBankDetail.id);
        }}
      />
      <Snackbar open={successMessage !== null} autoHideDuration={5000} onClose={() => setSuccessMessage(null)}>
        <Alert severity="success" variant="filled" onClose={() => setSuccessMessage(null)}>{successMessage}</Alert>
      </Snackbar>
    </SettingsPageShell>
  );
}

function SettingsPageShell({ title, description, children }: PropsWithChildren<{ title: string; description: string }>) {
  return (
    <Stack spacing={3} maxWidth={1120}>
      <Box>
        <Typography component="h1" variant="h1">{title}</Typography>
        <Typography color="text.secondary">{description}</Typography>
      </Box>
      {children}
    </Stack>
  );
}
