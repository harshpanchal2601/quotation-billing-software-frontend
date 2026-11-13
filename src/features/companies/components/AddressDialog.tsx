import { zodResolver } from '@hookform/resolvers/zod';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMediaQuery, useTheme } from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useId, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { PERMISSIONS, useHasPermission } from '@features/auth';
import { toApiError } from '@shared/api/apiClient';
import { FormActions } from '@shared/forms';
import { ControlledCheckbox, ControlledTextField } from '@shared/forms/controlled';
import { AppButton } from '@shared/ui/actions';
import { AppDialog, ConfirmDialog } from '@shared/ui/dialogs';
import { ServerErrorAlert, useNotification } from '@shared/ui/feedback';

import { createCompanyAddressRequest } from '../api/addresses.api';
import { companiesQueryKeys } from '../model/companies.query-keys';
import type { CompanyAddress } from '../model/companies.types';
import { addressTypeLabel } from '../model/companies.utils';
import { addressSchema, addressTypes, toAddressSubmitValues, type AddressFormValues, type AddressSubmitValues } from '../model/address.schema';

const emptyAddressValues: AddressFormValues = {
  addressType: 'BILLING',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'India',
  isPrimary: false,
};

type AddressDialogProps = {
  open: boolean;
  address: CompanyAddress | null;
  isSubmitting: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onSubmit: (values: AddressSubmitValues) => Promise<void>;
};

export function AddressDialog({ open, address, isSubmitting, errorMessage, onClose, onSubmit }: AddressDialogProps) {
  const formId = useId();
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down('sm'));
  const [discard, setDiscard] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: emptyAddressValues,
    mode: 'onChange',
  });
  const { isDirty, isValid } = form.formState;
  const close = () => { setDiscard(false); onClose(); };
  const requestClose = () => { if (isSubmitting) return; if (isDirty) setDiscard(true); else close(); };
  const handleSubmit = form.handleSubmit(async (values) => {
    setSubmissionError(null);
    try { await onSubmit(toAddressSubmitValues(values)); }
    catch (error) { setSubmissionError(toApiError(error).message); }
  });

  useEffect(() => {
    form.reset(addressToFormValues(address));
    setDiscard(false);
    setSubmissionError(null);
  }, [address, form, open]);

  return (
    <><AppDialog
      open={open}
      onClose={requestClose}
      preventClose={isSubmitting}
      fullWidth
      maxWidth="sm"
      fullScreen={compact}
      contentDividers
      title={address ? 'Edit address' : 'Add address'}
      actions={
        <FormActions
          submitLabel={isSubmitting ? 'Saving' : 'Save address'}
          isSubmitting={isSubmitting}
          isSubmitDisabled={isSubmitting || !isValid}
          onCancel={requestClose}
          submitButtonProps={{ form: formId }}
        />
      }
    >
        <Typography color="text.secondary" mb={2}>One primary address is allowed for each address type.</Typography>
        <Stack component="form" id={formId} spacing={2} onSubmit={(event) => { event.stopPropagation(); void handleSubmit(event); }} noValidate>
          <ServerErrorAlert message={errorMessage ?? submissionError} />
          <Controller name="addressType" control={form.control} render={({ field, fieldState }) => (
            <TextField {...field} select fullWidth required label="Address type" disabled={isSubmitting} error={fieldState.invalid} helperText={fieldState.error?.message}>
              {addressTypes.map((addressType) => <MenuItem key={addressType} value={addressType}>{addressTypeLabel(addressType)}</MenuItem>)}
            </TextField>
          )} />
          <AddressTextField control={form.control} name="addressLine1" label="Address line 1" required disabled={isSubmitting} />
          <AddressTextField control={form.control} name="addressLine2" label="Address line 2" disabled={isSubmitting} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <AddressTextField control={form.control} name="city" label="City" disabled={isSubmitting} />
            <AddressTextField control={form.control} name="state" label="State" disabled={isSubmitting} />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <AddressTextField control={form.control} name="postalCode" label="Postal code" disabled={isSubmitting} />
            <AddressTextField control={form.control} name="country" label="Country" required disabled={isSubmitting} />
          </Stack>
          <ControlledCheckbox control={form.control} name="isPrimary" label="Make primary for this type" disabled={isSubmitting} />
        </Stack>
    </AppDialog><ConfirmDialog open={discard} title="Discard unsaved changes?" confirmLabel="Discard changes" confirmColor="warning" onClose={() => setDiscard(false)} onConfirm={close}>Your address changes have not been saved. Keep editing or discard them.</ConfirmDialog></>
  );
}

export function CreateCompanyAddressAction({ companyId, onCreated, disabled = false }: { companyId: number; onCreated: (address: CompanyAddress) => void; disabled?: boolean }) {
  const canManage = useHasPermission(PERMISSIONS.COMPANIES_MANAGE);
  const cache = useQueryClient();
  const notify = useNotification();
  const [open, setOpen] = useState(false);
  const create = useMutation({
    mutationFn: (values: AddressSubmitValues) => createCompanyAddressRequest(companyId, values),
    onSuccess: async (address) => {
      setOpen(false);
      onCreated(address);
      notify('Customer address saved.');
      try { await cache.invalidateQueries({ queryKey: companiesQueryKeys.detail(companyId) }); }
      catch { notify('Address saved, but the company details could not refresh.', 'warning'); }
    },
  });
  if (!canManage) return null;
  return <><AppButton disabled={disabled || companyId <= 0 || create.isPending} onClick={() => { create.reset(); setOpen(true); }}>Add customer address</AppButton>
    <AddressDialog open={open} address={null} isSubmitting={create.isPending} errorMessage={create.isError ? toApiError(create.error).message : null} onClose={() => setOpen(false)} onSubmit={async (values) => { await create.mutateAsync(values); }} />
  </>;
}

type AddressTextFieldName = Exclude<keyof AddressFormValues, 'addressType' | 'isPrimary'>;

function AddressTextField({ control, name, label, disabled, required }: { control: ReturnType<typeof useForm<AddressFormValues>>['control']; name: AddressTextFieldName; label: string; disabled: boolean; required?: boolean }) {
  return <ControlledTextField control={control} name={name} required={required} label={label} disabled={disabled} />;
}

function addressToFormValues(address: CompanyAddress | null): AddressFormValues {
  if (!address) return emptyAddressValues;
  return {
    addressType: address.addressType,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2 ?? '',
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country,
    isPrimary: address.isPrimary,
  };
}
