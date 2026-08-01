import { zodResolver } from '@hookform/resolvers/zod';
import Autocomplete from '@mui/material/Autocomplete';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';

import type { ApiFieldErrors } from '@shared/api/apiClient';
import { FormActions } from '@shared/forms';
import { ControlledCheckbox, ControlledTextField } from '@shared/forms/controlled';
import { AppDialog } from '@shared/ui/dialogs';
import { ServerErrorAlert } from '@shared/ui/feedback';
import { applyApiFieldErrors } from '@shared/forms/formErrors';
import { bankDetailsSchema, type BankDetailsFormValues, type BankDetailsSubmitValues } from '../schemas/bank-details.schema';
import type { BankDetail } from '../settings.types';

const accountTypeOptions = ['Current', 'Savings', 'Cash Credit', 'Overdraft'];

const emptyValues: BankDetailsFormValues = {
  bankName: '',
  accountName: '',
  accountNumber: '',
  accountType: '',
  ifscCode: '',
  branchName: '',
  swiftCode: '',
  upiId: '',
  isDefault: false,
};

type BankDetailsDialogProps = {
  open: boolean;
  bankDetail: BankDetail | null;
  isSubmitting: boolean;
  errorMessage: string | null;
  fieldErrors: ApiFieldErrors;
  onClose: () => void;
  onSubmit: (values: BankDetailsSubmitValues) => Promise<void>;
};

export function BankDetailsDialog({ open, bankDetail, isSubmitting, errorMessage, fieldErrors, onClose, onSubmit }: BankDetailsDialogProps) {
  const form = useForm<BankDetailsFormValues, unknown, BankDetailsSubmitValues>({
    resolver: zodResolver(bankDetailsSchema),
    defaultValues: emptyValues,
    mode: 'onChange',
  });

  useEffect(() => {
    if (!open) {
      form.reset(emptyValues);
      return;
    }
    form.reset(bankDetailToFormValues(bankDetail));
  }, [bankDetail, form, open]);

  useEffect(() => {
    if (open) applyApiFieldErrors(form, fieldErrors);
  }, [fieldErrors, form, open]);

  const title = bankDetail === null ? 'Add bank account' : 'Edit bank account';

  async function handleValidSubmit(values: BankDetailsSubmitValues) {
    form.clearErrors();
    try {
      await onSubmit(values);
    } catch {
      // The parent mutation exposes API errors through errorMessage and fieldErrors.
    }
  }

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      preventClose={isSubmitting}
      fullWidth
      maxWidth="md"
      title={title}
      actions={
        <FormActions
          submitLabel={isSubmitting ? 'Saving...' : 'Save account'}
          isSubmitting={isSubmitting}
          isSubmitDisabled={!form.formState.isValid}
          onCancel={onClose}
          submitButtonProps={{ form: 'bank-details-form' }}
        />
      }
    >
        <Typography color="text.secondary" mb={2}>
          Account numbers are stored as text so leading zeros and bank-specific formats are preserved.
        </Typography>
        <Stack component="form" id="bank-details-form" spacing={2} onSubmit={(event) => void form.handleSubmit(handleValidSubmit)(event)} noValidate aria-busy={isSubmitting}>
          <ServerErrorAlert message={errorMessage} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <ControlledTextField
              name="bankName"
              control={form.control}
              required
              autoFocus
              label="Bank name"
              autoComplete="organization"
              disabled={isSubmitting}
            />
            <ControlledTextField
              name="accountName"
              control={form.control}
              required
              label="Account name"
              autoComplete="name"
              disabled={isSubmitting}
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <ControlledTextField
              name="accountNumber"
              control={form.control}
              required
              label="Account number"
              autoComplete="off"
              disabled={isSubmitting}
            />
            <Controller
              name="accountType"
              control={form.control}
              render={({ field, fieldState }) => (
                <Autocomplete
                  freeSolo
                  options={accountTypeOptions}
                  value={field.value ?? ''}
                  onChange={(_event, value) => field.onChange(value ?? '')}
                  onInputChange={(_event, value) => field.onChange(value)}
                  disabled={isSubmitting}
                  renderInput={(params) => (
                    <TextField {...params} label="Account type" error={fieldState.invalid} helperText={fieldState.error?.message ?? 'Common values are suggestions only.'} />
                  )}
                />
              )}
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <ControlledTextField
              name="ifscCode"
              control={form.control}
              label="IFSC code"
              autoComplete="off"
              disabled={isSubmitting}
            />
            <ControlledTextField
              name="branchName"
              control={form.control}
              label="Branch name"
              autoComplete="address-level2"
              disabled={isSubmitting}
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <ControlledTextField
              name="swiftCode"
              control={form.control}
              label="SWIFT/BIC code"
              autoComplete="off"
              disabled={isSubmitting}
            />
            <ControlledTextField
              name="upiId"
              control={form.control}
              label="UPI ID"
              autoComplete="off"
              disabled={isSubmitting}
            />
          </Stack>
          <ControlledCheckbox
            name="isDefault"
            control={form.control}
            label="Make this the default account"
            disabled={isSubmitting}
          />
        </Stack>
    </AppDialog>
  );
}

function bankDetailToFormValues(bankDetail: BankDetail | null): BankDetailsFormValues {
  if (bankDetail === null) return emptyValues;
  return {
    bankName: bankDetail.bankName,
    accountName: bankDetail.accountName,
    accountNumber: bankDetail.accountNumber,
    accountType: bankDetail.accountType ?? '',
    ifscCode: bankDetail.ifscCode ?? '',
    branchName: bankDetail.branchName ?? '',
    swiftCode: bankDetail.swiftCode ?? '',
    upiId: bankDetail.upiId ?? '',
    isDefault: bankDetail.isDefault,
  };
}
