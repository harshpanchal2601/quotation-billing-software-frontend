import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type PropsWithChildren } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { ErrorState } from '@shared/components/common/ErrorState';
import { toApiError } from '@shared/api/apiClient';
import { FormActions, FormExitGuard } from '@shared/forms';
import { useAuth } from '@features/auth';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { AppDialog } from '@shared/ui/dialogs';
import { ControlledSwitch, ControlledTextField } from '@shared/forms/controlled';
import { AppButton } from '@shared/ui/actions';
import { AppSnackbar, ServerErrorAlert } from '@shared/ui/feedback';
import { DetailFields, DetailSection, PageContainer, PageHeader } from '@shared/ui/layout';
import {
  getQuotationSettingsRequest,
  quotationSettingsQueryKey,
  updateQuotationSettingsRequest,
} from '../api/quotation-settings.api';
import { SettingsSection } from '../components/SettingsSection';
import {
  quotationSettingsSchema,
  sequenceResetRuleOptions,
  taxModeOptions,
  type QuotationSettingsFormValues,
  type QuotationSettingsSubmitValues,
} from '../model/quotation-settings.schema';
import type { QuotationSettings } from '../model/settings.types';

export function QuotationSettingsPage() {
  const firmId = useFirmId(); const { user } = useAuth();
  return <QuotationSettingsWorkspace key={`${firmId}:${user?.id}`} />;
}

function QuotationSettingsWorkspace() {
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const saveLock = useRef(false);
  const firmId = useFirmId(); const { user } = useAuth();
  const queryKey = [...quotationSettingsQueryKey, firmId, user?.id];
  const query = useQuery({ queryKey, queryFn: getQuotationSettingsRequest });
  const form = useForm<QuotationSettingsFormValues, unknown, QuotationSettingsSubmitValues>({
    resolver: zodResolver(quotationSettingsSchema),
    mode: 'onChange',
    defaultValues: emptyQuotationValues,
  });

  const updateMutation = useMutation({
    mutationFn: updateQuotationSettingsRequest,
    onSuccess: (quotationSettings) => {
      queryClient.setQueryData(queryKey, quotationSettings);
      form.reset(toQuotationFormValues(quotationSettings));
      setServerError(null);
      setEditing(false);
      setSuccessMessage('Quotation settings saved.');
    },
    onError: (error) => setServerError(toApiError(error).message),
    onSettled: () => { saveLock.current = false; },
  });

  async function onSubmit(values: QuotationSettingsSubmitValues) {
    if (saveLock.current) return;
    saveLock.current = true;
    setServerError(null);
    try { await updateMutation.mutateAsync(values); } catch { /* The mutation displays the failure and preserves the editor. */ }
  }

  if (query.isPending) {
    return (
      <PageContainer maxWidth={1120}>
        <PageHeader title="Quotation Settings" description="Manage numbering, defaults and PDF display preferences." />
        <Stack spacing={2}>{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} height={56} />)}</Stack>
      </PageContainer>
    );
  }

  if (query.isError && !query.data) {
    return (
      <PageContainer maxWidth={1120}>
        <PageHeader title="Quotation Settings" description="Manage numbering, defaults and PDF display preferences." />
        <ErrorState message={toApiError(query.error).message} />
        <AppButton onClick={() => void query.refetch()} variant="outlined">Retry</AppButton>
      </PageContainer>
    );
  }

  const isBusy = updateMutation.isPending;
  const settings = query.data!;
  const openEditor = () => {
    if (saveLock.current) return;
    form.reset(toQuotationFormValues(settings));
    setServerError(null);
    setEditing(true);
  };

  return (
    <PageContainer maxWidth={1120}>
      <PageHeader title="Quotation Settings" description="Manage numbering, defaults and PDF display preferences." />
      {query.isError ? <ErrorState message={toApiError(query.error).message} onRetry={() => void query.refetch()} /> : null}
      <DetailSection title="Numbering and defaults" actions={<AppButton variant="outlined" disabled={editing} onClick={openEditor}>Edit quotation settings</AppButton>}>
        <DetailFields fields={[
          { label: 'Quotation prefix', value: settings.quotationPrefix }, { label: 'Financial year format', value: settings.financialYearFormat },
          { label: 'Next sequence number', value: settings.nextSequenceNumber }, { label: 'Number sequence', value: 'Continuous across financial years' },
          { label: 'Default validity', value: `${settings.defaultValidityDays} days` }, { label: 'Default tax mode', value: taxModeOptions.find((option) => option.value === settings.defaultTaxMode)?.label },
          { label: 'Default GST rate', value: `${settings.defaultGstRate}%` },
        ]} />
      </DetailSection>
      <DetailSection title="Commercial terms and content"><DetailFields fields={[
        { label: 'Delivery terms', value: settings.defaultDeliveryTerms || 'Not set' }, { label: 'Dispatch terms', value: settings.defaultDispatchTerms || 'Not set' },
        { label: 'Payment terms', value: settings.defaultPaymentTerms || 'Not set' }, { label: 'Freight terms', value: settings.defaultFreightTerms || 'Not set' },
        { label: 'Warranty terms', value: settings.defaultWarrantyTerms || 'Not set' }, { label: 'Default remarks', value: settings.defaultRemarks || 'Not set' },
        { label: 'Default terms and conditions', value: settings.defaultTermsAndConditions || 'Not set' },
      ]} /></DetailSection>
      <DetailSection title="PDF display preferences"><DetailFields fields={[
        { label: 'Show bank details', value: settings.showBankDetails ? 'Yes' : 'No' }, { label: 'Show amount in words', value: settings.showAmountInWords ? 'Yes' : 'No' },
      ]} /></DetailSection>
      {editing ? <FormExitGuard dirty={form.formState.isDirty} isSubmitting={isBusy} onCancel={() => setEditing(false)}>{(requestClose) => <AppDialog open title="Edit quotation settings" fullWidth maxWidth="md" preventClose={isBusy || saveLock.current} onClose={requestClose} actions={<FormActions submitLabel="Save changes" isSubmitting={isBusy} isSubmitDisabled={!form.formState.isDirty} onCancel={requestClose} submitButtonProps={{ form: 'quotation-settings-form' }} />}>
      <Stack component="form" id="quotation-settings-form" spacing={2} onSubmit={(event) => void form.handleSubmit(onSubmit)(event)} noValidate>
        <ServerErrorAlert message={serverError} />
        {form.formState.isDirty ? <Alert severity="info">You have unsaved changes.</Alert> : null}
        <SettingsSection title="Quotation numbering">
          <TwoColumnGrid>
            <ControlledTextField control={form.control} name="quotationPrefix" label="Quotation prefix" required disabled={isBusy} />
            <QuotationTextField form={form} name="financialYearFormat" label="Financial year format" required disabled={isBusy} select>
              <MenuItem value="YYYY-YY">YYYY-YY</MenuItem>
            </QuotationTextField>
            <QuotationTextField form={form} name="nextSequenceNumber" label="Next sequence number" required disabled={isBusy} type="number" />
            <QuotationTextField form={form} name="sequenceResetRule" label="Saved sequence rule" required disabled select helperText="Quotation numbers continue in sequence across financial years.">
              {sequenceResetRuleOptions.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
            </QuotationTextField>
          </TwoColumnGrid>
        </SettingsSection>
        <SettingsSection title="Default quotation behaviour">
          <TwoColumnGrid>
            <QuotationTextField form={form} name="defaultValidityDays" label="Default validity days" required disabled={isBusy} type="number" />
            <QuotationTextField form={form} name="defaultTaxMode" label="Default tax mode" required disabled={isBusy} select>
              {taxModeOptions.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
            </QuotationTextField>
            <QuotationTextField form={form} name="defaultGstRate" label="Default GST rate" required disabled={isBusy} helperText="Enter a percentage from 0 to 100, for example 18.00." />
          </TwoColumnGrid>
        </SettingsSection>
        <SettingsSection title="Default commercial terms">
          <TwoColumnGrid>
            <ControlledTextField control={form.control} name="defaultDeliveryTerms" label="Delivery terms" disabled={isBusy} multiline minRows={3} />
            <ControlledTextField control={form.control} name="defaultDispatchTerms" label="Dispatch terms" disabled={isBusy} multiline minRows={3} />
            <ControlledTextField control={form.control} name="defaultPaymentTerms" label="Payment terms" disabled={isBusy} multiline minRows={3} />
            <ControlledTextField control={form.control} name="defaultFreightTerms" label="Freight terms" disabled={isBusy} multiline minRows={3} />
            <ControlledTextField control={form.control} name="defaultWarrantyTerms" label="Warranty terms" disabled={isBusy} multiline minRows={3} />
          </TwoColumnGrid>
        </SettingsSection>
        <SettingsSection title="Default content">
          <Stack spacing={2}>
            <ControlledTextField control={form.control} name="defaultRemarks" label="Default remarks" disabled={isBusy} multiline minRows={4} />
            <ControlledTextField control={form.control} name="defaultTermsAndConditions" label="Default terms and conditions" disabled={isBusy} multiline minRows={6} />
          </Stack>
        </SettingsSection>
        <SettingsSection title="PDF display preferences">
          <Stack spacing={1}>
            <ControlledSwitch
              control={form.control}
              name="showBankDetails"
              label="Show bank details on quotation PDFs"
              disabled={isBusy}
            />
            <ControlledSwitch
              control={form.control}
              name="showAmountInWords"
              label="Show amount in words on quotation PDFs"
              disabled={isBusy}
            />
          </Stack>
        </SettingsSection>
      </Stack>
      </AppDialog>}</FormExitGuard> : null}
      <AppSnackbar open={successMessage !== null} message={successMessage} onClose={() => setSuccessMessage(null)} />
    </PageContainer>
  );
}

type QuotationForm = ReturnType<typeof useForm<QuotationSettingsFormValues, unknown, QuotationSettingsSubmitValues>>;

function QuotationTextField({ form, name, children, helperText, ...props }: {
  form: QuotationForm;
  name: keyof QuotationSettingsFormValues;
  children?: React.ReactNode;
  helperText?: string;
} & Omit<React.ComponentProps<typeof TextField>, 'name' | 'value' | 'onChange' | 'error'>) {
  return (
    <Controller
      name={name}
      control={form.control}
      render={({ field, fieldState }) => (
        <TextField {...field} {...props} value={field.value ?? ''} fullWidth error={fieldState.invalid} helperText={fieldState.error?.message ?? helperText}>
          {children}
        </TextField>
      )}
    />
  );
}

function TwoColumnGrid({ children }: PropsWithChildren) {
  return <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }} gap={2}>{children}</Box>;
}

const emptyQuotationValues: QuotationSettingsFormValues = {
  quotationPrefix: '',
  financialYearFormat: 'YYYY-YY',
  nextSequenceNumber: 1,
  sequenceResetRule: 'FINANCIAL_YEAR',
  defaultValidityDays: 30,
  defaultTaxMode: 'CGST_SGST',
  defaultGstRate: '18.00',
  defaultDeliveryTerms: '',
  defaultDispatchTerms: '',
  defaultPaymentTerms: '',
  defaultFreightTerms: '',
  defaultWarrantyTerms: '',
  defaultRemarks: '',
  defaultTermsAndConditions: '',
  showBankDetails: true,
  showAmountInWords: true,
};

function toQuotationFormValues(settings: QuotationSettings): QuotationSettingsFormValues {
  return {
    quotationPrefix: settings.quotationPrefix,
    financialYearFormat: settings.financialYearFormat,
    nextSequenceNumber: settings.nextSequenceNumber,
    sequenceResetRule: settings.sequenceResetRule,
    defaultValidityDays: settings.defaultValidityDays,
    defaultTaxMode: settings.defaultTaxMode,
    defaultGstRate: settings.defaultGstRate,
    defaultDeliveryTerms: settings.defaultDeliveryTerms ?? '',
    defaultDispatchTerms: settings.defaultDispatchTerms ?? '',
    defaultPaymentTerms: settings.defaultPaymentTerms ?? '',
    defaultFreightTerms: settings.defaultFreightTerms ?? '',
    defaultWarrantyTerms: settings.defaultWarrantyTerms ?? '',
    defaultRemarks: settings.defaultRemarks ?? '',
    defaultTermsAndConditions: settings.defaultTermsAndConditions ?? '',
    showBankDetails: settings.showBankDetails,
    showAmountInWords: settings.showAmountInWords,
  };
}
