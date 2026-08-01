import { zodResolver } from '@hookform/resolvers/zod';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { FormActions } from '@shared/forms';
import { ControlledCheckbox, ControlledTextField } from '@shared/forms/controlled';
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
        <FormActions
          submitLabel={isSubmitting ? 'Saving' : 'Save address'}
          isSubmitting={isSubmitting}
          isSubmitDisabled={isSubmitting || !form.formState.isValid}
          onCancel={onClose}
          submitButtonProps={{ form: 'address-form' }}
        />
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
          <ControlledCheckbox control={form.control} name="isPrimary" label="Make primary for this type" disabled={isSubmitting} />
        </Stack>
    </AppDialog>
  );
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
