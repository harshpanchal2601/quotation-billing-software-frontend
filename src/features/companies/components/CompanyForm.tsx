import { zodResolver } from '@hookform/resolvers/zod';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useEffect } from 'react';
import { useForm, type Control, type FieldPath } from 'react-hook-form';

import { FormActions, FormSection } from '@shared/forms';
import { ControlledCheckbox, ControlledTextField } from '@shared/forms/controlled';
import { AppButton } from '@shared/ui/actions';
import { ServerErrorAlert } from '@shared/ui/feedback';

import {
  companyCreateFormSchema,
  companyUpdateSchema,
  toCompanyCreateSubmitValues,
  toCompanyUpdateSubmitValues,
  type CompanyCreateFormValues,
  type CompanyCreateSubmitValues,
  type CompanyUpdateFormValues,
  type CompanyUpdateSubmitValues,
} from '../model/company.schema';
import type { CompanyDetail } from '../model/companies.types';

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
        <ServerErrorAlert message={errorMessage} />
        <Typography color="text.secondary">Company code is generated automatically after saving.</Typography>
        <CompanyFields control={form.control} disabled={isSubmitting} />
        <Divider />
        <FormSection title="Primary contact">
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <ControlledTextField control={form.control} name="contact.name" label="Contact name" disabled={isSubmitting} />
            <ControlledTextField control={form.control} name="contact.designation" label="Designation" disabled={isSubmitting} />
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <ControlledTextField control={form.control} name="contact.email" label="Email" disabled={isSubmitting} />
            <ControlledTextField control={form.control} name="contact.phone" label="Phone" disabled={isSubmitting} />
            <ControlledTextField control={form.control} name="contact.alternatePhone" label="Alternate phone" disabled={isSubmitting} />
          </Stack>
        </FormSection>
        <Divider />
        <AddressFields control={form.control} prefix="billingAddress" title="Billing address" disabled={isSubmitting} />
        <ControlledCheckbox
          control={form.control}
          name="useBillingAsShipping"
          label="Use billing address as shipping address"
          disabled={isSubmitting}
        />
        {!useBillingAsShipping ? <AddressFields control={form.control} prefix="shippingAddress" title="Shipping address" disabled={isSubmitting} /> : null}
        <FormActions isSubmitting={isSubmitting} isSubmitDisabled={!form.formState.isValid || isSubmitting} onCancel={onCancel} submitLabel="Create company" />
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
        <ServerErrorAlert message={errorMessage} />
        <Box>
          <Typography variant="body2" color="text.secondary">Company code</Typography>
          <Typography fontWeight={700}>{company.companyCode}</Typography>
        </Box>
        <CompanyFields control={form.control} disabled={isSubmitting} />
        <FormActions
          isSubmitting={isSubmitting}
          isSubmitDisabled={isSubmitting || !form.formState.isValid || !form.formState.isDirty}
          onCancel={onCancel}
          submitLabel={isSubmitting ? 'Saving' : 'Save changes'}
          secondaryAction={
            <AppButton onClick={() => form.reset(companyToUpdateValues(company))} disabled={isSubmitting || !form.formState.isDirty}>
              Reset
            </AppButton>
          }
        />
      </Stack>
    </Paper>
  );
}

function CompanyFields<TFieldValues extends CompanyCreateFormValues | CompanyUpdateFormValues>({ control, disabled }: { control: Control<TFieldValues>; disabled: boolean }) {
  return (
    <>
      <FormSection title="Company information">
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <ControlledTextField control={control} name={'name' as FieldPath<TFieldValues>} label="Company name" required disabled={disabled} />
          <ControlledTextField control={control} name={'legalName' as FieldPath<TFieldValues>} label="Legal name" disabled={disabled} />
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <ControlledTextField control={control} name={'website' as FieldPath<TFieldValues>} label="Website" disabled={disabled} />
          <ControlledCheckbox control={control} name={'isActive' as FieldPath<TFieldValues>} label="Active company" disabled={disabled} />
        </Stack>
      </FormSection>
      <FormSection title="Legal and tax information">
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <ControlledTextField control={control} name={'gstin' as FieldPath<TFieldValues>} label="GSTIN" disabled={disabled} />
          <ControlledTextField control={control} name={'pan' as FieldPath<TFieldValues>} label="PAN" disabled={disabled} />
        </Stack>
        <ControlledTextField control={control} name={'notes' as FieldPath<TFieldValues>} label="Notes" disabled={disabled} multiline minRows={4} />
      </FormSection>
    </>
  );
}

function AddressFields({ control, prefix, title, disabled }: { control: ReturnType<typeof useForm<CompanyCreateFormValues>>['control']; prefix: 'billingAddress' | 'shippingAddress'; title: string; disabled: boolean }) {
  return (
    <FormSection title={title}>
      <ControlledTextField control={control} name={`${prefix}.addressLine1`} label="Address line 1" disabled={disabled} />
      <ControlledTextField control={control} name={`${prefix}.addressLine2`} label="Address line 2" disabled={disabled} />
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <ControlledTextField control={control} name={`${prefix}.city`} label="City" disabled={disabled} />
        <ControlledTextField control={control} name={`${prefix}.state`} label="State" disabled={disabled} />
        <ControlledTextField control={control} name={`${prefix}.postalCode`} label="Postal code" disabled={disabled} />
      </Stack>
      <ControlledTextField control={control} name={`${prefix}.country`} label="Country" disabled={disabled} />
    </FormSection>
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
