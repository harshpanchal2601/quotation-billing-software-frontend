import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useEffect, type PropsWithChildren } from 'react';
import { Controller, useForm, type Control, type FieldPath, type FieldValues } from 'react-hook-form';

import {
  companyCreateFormSchema,
  companyUpdateSchema,
  toCompanyCreateSubmitValues,
  toCompanyUpdateSubmitValues,
  type CompanyCreateFormValues,
  type CompanyCreateSubmitValues,
  type CompanyUpdateFormValues,
  type CompanyUpdateSubmitValues,
} from '../schemas/company.schema';
import type { CompanyDetail } from '../companies.types';

const emptyCompanyCreateValues: CompanyCreateFormValues = {
  name: '',
  legalName: '',
  website: '',
  isActive: true,
  gstin: '',
  pan: '',
  notes: '',
  contact: { name: '', designation: '', email: '', phone: '', alternatePhone: '', isPrimary: true },
  billingAddress: { addressType: 'BILLING', addressLine1: '', addressLine2: '', city: '', state: '', postalCode: '', country: 'India', isPrimary: true },
  useBillingAsShipping: true,
  shippingAddress: { addressType: 'SHIPPING', addressLine1: '', addressLine2: '', city: '', state: '', postalCode: '', country: 'India', isPrimary: true },
};

type CompanyFormProps =
  | {
      mode: 'create';
      isSubmitting: boolean;
      errorMessage: string | null;
      onSubmit: (values: CompanyCreateSubmitValues) => Promise<void>;
      onCancel: () => void;
    }
  | {
      mode: 'edit';
      company: CompanyDetail;
      isSubmitting: boolean;
      errorMessage: string | null;
      onSubmit: (values: CompanyUpdateSubmitValues) => Promise<void>;
      onCancel: () => void;
    };

export function CompanyForm(props: CompanyFormProps) {
  if (props.mode === 'create') return <CompanyCreateForm {...props} />;
  return <CompanyEditForm {...props} />;
}

function CompanyCreateForm({ isSubmitting, errorMessage, onSubmit, onCancel }: Extract<CompanyFormProps, { mode: 'create' }>) {
  const form = useForm<CompanyCreateFormValues>({
    resolver: zodResolver(companyCreateFormSchema),
    defaultValues: emptyCompanyCreateValues,
    mode: 'onChange',
  });
  const useBillingAsShipping = form.watch('useBillingAsShipping');
  const handleSubmit = form.handleSubmit(async (values) => onSubmit(toCompanyCreateSubmitValues(values)));

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
      <Stack component="form" spacing={3} onSubmit={(event) => void handleSubmit(event)} noValidate>
        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
        <Typography color="text.secondary">Company code is generated automatically after saving.</Typography>
        <CompanyFields control={form.control} disabled={isSubmitting} />
        <Divider />
        <FormSection title="Primary contact">
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextController control={form.control} name="contact.name" label="Contact name" disabled={isSubmitting} />
            <TextController control={form.control} name="contact.designation" label="Designation" disabled={isSubmitting} />
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextController control={form.control} name="contact.email" label="Email" disabled={isSubmitting} />
            <TextController control={form.control} name="contact.phone" label="Phone" disabled={isSubmitting} />
            <TextController control={form.control} name="contact.alternatePhone" label="Alternate phone" disabled={isSubmitting} />
          </Stack>
        </FormSection>
        <Divider />
        <AddressFields control={form.control} prefix="billingAddress" title="Billing address" disabled={isSubmitting} />
        <Controller
          name="useBillingAsShipping"
          control={form.control}
          render={({ field }) => (
            <FormControlLabel control={<Checkbox checked={field.value} onChange={(event) => field.onChange(event.target.checked)} disabled={isSubmitting} />} label="Use billing address as shipping address" />
          )}
        />
        {!useBillingAsShipping ? <AddressFields control={form.control} prefix="shippingAddress" title="Shipping address" disabled={isSubmitting} /> : null}
        <FormActions isSubmitting={isSubmitting} isSaveDisabled={!form.formState.isValid || isSubmitting} onCancel={onCancel} submitLabel="Create company" />
      </Stack>
    </Paper>
  );
}

function CompanyEditForm({ company, isSubmitting, errorMessage, onSubmit, onCancel }: Extract<CompanyFormProps, { mode: 'edit' }>) {
  const form = useForm<CompanyUpdateFormValues>({
    resolver: zodResolver(companyUpdateSchema),
    defaultValues: companyToUpdateValues(company),
    mode: 'onChange',
  });
  const handleSubmit = form.handleSubmit(async (values) => onSubmit(toCompanyUpdateSubmitValues(values)));

  useEffect(() => {
    form.reset(companyToUpdateValues(company));
  }, [company, form]);

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
      <Stack component="form" spacing={3} onSubmit={(event) => void handleSubmit(event)} noValidate>
        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
        <Box>
          <Typography variant="body2" color="text.secondary">Company code</Typography>
          <Typography fontWeight={700}>{company.companyCode}</Typography>
        </Box>
        <CompanyFields control={form.control} disabled={isSubmitting} />
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button onClick={() => form.reset(companyToUpdateValues(company))} disabled={isSubmitting || !form.formState.isDirty}>Reset</Button>
          <Button onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting || !form.formState.isValid || !form.formState.isDirty}>
            {isSubmitting ? 'Saving' : 'Save changes'}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}

function CompanyFields<TFieldValues extends CompanyCreateFormValues | CompanyUpdateFormValues>({ control, disabled }: { control: Control<TFieldValues>; disabled: boolean }) {
  return (
    <>
      <FormSection title="Company information">
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextController control={control} name={'name' as FieldPath<TFieldValues>} label="Company name" required disabled={disabled} />
          <TextController control={control} name={'legalName' as FieldPath<TFieldValues>} label="Legal name" disabled={disabled} />
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextController control={control} name={'website' as FieldPath<TFieldValues>} label="Website" disabled={disabled} />
          <Controller name={'isActive' as FieldPath<TFieldValues>} control={control} render={({ field }) => <FormControlLabel control={<Checkbox checked={Boolean(field.value)} onChange={(event) => field.onChange(event.target.checked)} disabled={disabled} />} label="Active company" />} />
        </Stack>
      </FormSection>
      <FormSection title="Legal and tax information">
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextController control={control} name={'gstin' as FieldPath<TFieldValues>} label="GSTIN" disabled={disabled} />
          <TextController control={control} name={'pan' as FieldPath<TFieldValues>} label="PAN" disabled={disabled} />
        </Stack>
        <TextController control={control} name={'notes' as FieldPath<TFieldValues>} label="Notes" disabled={disabled} multiline minRows={4} />
      </FormSection>
    </>
  );
}

function AddressFields({ control, prefix, title, disabled }: { control: ReturnType<typeof useForm<CompanyCreateFormValues>>['control']; prefix: 'billingAddress' | 'shippingAddress'; title: string; disabled: boolean }) {
  return (
    <FormSection title={title}>
      <TextController control={control} name={`${prefix}.addressLine1`} label="Address line 1" disabled={disabled} />
      <TextController control={control} name={`${prefix}.addressLine2`} label="Address line 2" disabled={disabled} />
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextController control={control} name={`${prefix}.city`} label="City" disabled={disabled} />
        <TextController control={control} name={`${prefix}.state`} label="State" disabled={disabled} />
        <TextController control={control} name={`${prefix}.postalCode`} label="Postal code" disabled={disabled} />
      </Stack>
      <TextController control={control} name={`${prefix}.country`} label="Country" disabled={disabled} />
    </FormSection>
  );
}

function TextController<TFieldValues extends FieldValues>({ control, name, label, disabled, required, multiline, minRows }: { control: Control<TFieldValues>; name: FieldPath<TFieldValues>; label: string; disabled: boolean; required?: boolean; multiline?: boolean; minRows?: number }) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <TextField {...field} value={String(field.value ?? '')} fullWidth required={required} label={label} disabled={disabled} error={fieldState.invalid} helperText={fieldState.error?.message} multiline={multiline} minRows={minRows} />
      )}
    />
  );
}

function FormSection({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <Stack spacing={2}>
      <Typography component="h2" variant="h3">{title}</Typography>
      {children}
    </Stack>
  );
}

function FormActions({ isSubmitting, isSaveDisabled, onCancel, submitLabel }: { isSubmitting: boolean; isSaveDisabled: boolean; onCancel: () => void; submitLabel: string }) {
  return (
    <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={1} justifyContent="flex-end">
      <Button onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
      <Button type="submit" variant="contained" disabled={isSaveDisabled}>{isSubmitting ? 'Saving' : submitLabel}</Button>
    </Stack>
  );
}

function companyToUpdateValues(company: CompanyDetail): CompanyUpdateFormValues {
  return {
    name: company.name,
    legalName: company.legalName ?? '',
    website: company.website ?? '',
    isActive: company.isActive,
    gstin: company.gstin ?? '',
    pan: company.pan ?? '',
    notes: company.notes ?? '',
  };
}
