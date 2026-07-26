import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';

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
  onClose: () => void;
  onSubmit: (values: BankDetailsSubmitValues) => Promise<void>;
};

export function BankDetailsDialog({ open, bankDetail, isSubmitting, errorMessage, onClose, onSubmit }: BankDetailsDialogProps) {
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

  const title = bankDetail === null ? 'Add bank account' : 'Edit bank account';

  return (
    <Dialog open={open} onClose={() => (!isSubmitting ? onClose() : undefined)} fullWidth maxWidth="md">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText mb={2}>
          Account numbers are stored as text so leading zeros and bank-specific formats are preserved.
        </DialogContentText>
        <Stack component="form" id="bank-details-form" spacing={2} onSubmit={(event) => void form.handleSubmit(onSubmit)(event)} noValidate>
          {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Controller
              name="bankName"
              control={form.control}
              render={({ field, fieldState }) => (
                <TextField {...field} fullWidth required autoFocus label="Bank name" autoComplete="organization" disabled={isSubmitting} error={fieldState.invalid} helperText={fieldState.error?.message} />
              )}
            />
            <Controller
              name="accountName"
              control={form.control}
              render={({ field, fieldState }) => (
                <TextField {...field} fullWidth required label="Account name" autoComplete="name" disabled={isSubmitting} error={fieldState.invalid} helperText={fieldState.error?.message} />
              )}
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Controller
              name="accountNumber"
              control={form.control}
              render={({ field, fieldState }) => (
                <TextField {...field} fullWidth required label="Account number" autoComplete="off" disabled={isSubmitting} error={fieldState.invalid} helperText={fieldState.error?.message} />
              )}
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
            <Controller
              name="ifscCode"
              control={form.control}
              render={({ field, fieldState }) => (
                <TextField {...field} fullWidth label="IFSC code" autoComplete="off" disabled={isSubmitting} error={fieldState.invalid} helperText={fieldState.error?.message} />
              )}
            />
            <Controller
              name="branchName"
              control={form.control}
              render={({ field, fieldState }) => (
                <TextField {...field} fullWidth label="Branch name" autoComplete="address-level2" disabled={isSubmitting} error={fieldState.invalid} helperText={fieldState.error?.message} />
              )}
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Controller
              name="swiftCode"
              control={form.control}
              render={({ field, fieldState }) => (
                <TextField {...field} fullWidth label="SWIFT/BIC code" autoComplete="off" disabled={isSubmitting} error={fieldState.invalid} helperText={fieldState.error?.message} />
              )}
            />
            <Controller
              name="upiId"
              control={form.control}
              render={({ field, fieldState }) => (
                <TextField {...field} fullWidth label="UPI ID" autoComplete="off" disabled={isSubmitting} error={fieldState.invalid} helperText={fieldState.error?.message} />
              )}
            />
          </Stack>
          <Controller
            name="isDefault"
            control={form.control}
            render={({ field }) => (
              <FormControlLabel
                control={<Checkbox checked={field.value} onChange={(event) => field.onChange(event.target.checked)} disabled={isSubmitting} />}
                label="Make this the default account"
              />
            )}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>Cancel</Button>
        <Button type="submit" form="bank-details-form" variant="contained" disabled={isSubmitting || !form.formState.isValid}>
          {isSubmitting ? 'Saving' : 'Save account'}
        </Button>
      </DialogActions>
    </Dialog>
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

