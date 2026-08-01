import { zodResolver } from '@hookform/resolvers/zod';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { AppButton } from '@shared/ui/actions';
import { AppDialog } from '@shared/ui/dialogs';
import { ServerErrorAlert } from '@shared/ui/feedback';

import type { CompanyAddress } from '../companies.types';
import { addressTypeLabel } from '../companies.utils';
import { addressSchema, addressTypes, toAddressSubmitValues, type AddressFormValues, type AddressSubmitValues } from '../schemas/address.schema';

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
  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: emptyAddressValues,
    mode: 'onChange',
  });
  const handleSubmit = form.handleSubmit(async (values) => onSubmit(toAddressSubmitValues(values)));

  useEffect(() => {
    form.reset(addressToFormValues(address));
  }, [address, form, open]);

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      preventClose={isSubmitting}
      fullWidth
      maxWidth="sm"
      title={address ? 'Edit address' : 'Add address'}
      actions={
        <>
          <AppButton onClick={onClose} disabled={isSubmitting}>Cancel</AppButton>
          <AppButton type="submit" form="address-form" variant="contained" disabled={isSubmitting || !form.formState.isValid}>{isSubmitting ? 'Saving' : 'Save address'}</AppButton>
        </>
      }
    >
        <Typography color="text.secondary" mb={2}>One primary address is allowed for each address type.</Typography>
        <Stack component="form" id="address-form" spacing={2} onSubmit={(event) => void handleSubmit(event)} noValidate>
          <ServerErrorAlert message={errorMessage} />
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
          <Controller name="isPrimary" control={form.control} render={({ field }) => <FormControlLabel control={<Checkbox checked={field.value} onChange={(event) => field.onChange(event.target.checked)} disabled={isSubmitting} />} label="Make primary for this type" />} />
        </Stack>
    </AppDialog>
  );
}

type AddressTextFieldName = Exclude<keyof AddressFormValues, 'addressType' | 'isPrimary'>;

function AddressTextField({ control, name, label, disabled, required }: { control: ReturnType<typeof useForm<AddressFormValues>>['control']; name: AddressTextFieldName; label: string; disabled: boolean; required?: boolean }) {
  return <Controller name={name} control={control} render={({ field, fieldState }) => <TextField {...field} fullWidth required={required} label={label} disabled={disabled} error={fieldState.invalid} helperText={fieldState.error?.message} />} />;
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
