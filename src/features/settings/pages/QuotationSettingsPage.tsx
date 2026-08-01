import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { ErrorState } from '@shared/components/common/ErrorState';
import { toApiError } from '@shared/api/apiClient';
import { FormActions } from '@shared/forms';
import { ControlledSwitch, ControlledTextField } from '@shared/forms/controlled';
import { AppButton } from '@shared/ui/actions';
import { AppSnackbar, ServerErrorAlert } from '@shared/ui/feedback';
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
} from '../schemas/quotation-settings.schema';
import type { QuotationSettings } from '../settings.types';

export function QuotationSettingsPage() {
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const hydratedSettingsId = useRef<number | null>(null);
  const query = useQuery({ queryKey: quotationSettingsQueryKey, queryFn: getQuotationSettingsRequest });
  const form = useForm<QuotationSettingsFormValues, unknown, QuotationSettingsSubmitValues>({
    resolver: zodResolver(quotationSettingsSchema),
    mode: 'onChange',
    defaultValues: emptyQuotationValues,
  });

  useEffect(() => {
    if (query.data && hydratedSettingsId.current !== query.data.id && !form.formState.isDirty) {
      form.reset(toQuotationFormValues(query.data));
      hydratedSettingsId.current = query.data.id;
    }
  }, [form, query.data]);

  const updateMutation = useMutation({
    mutationFn: updateQuotationSettingsRequest,
    onSuccess: (quotationSettings) => {
      queryClient.setQueryData(quotationSettingsQueryKey, quotationSettings);
      form.reset(toQuotationFormValues(quotationSettings));
      setServerError(null);
      setSuccessMessage('Quotation settings saved.');
    },
    onError: (error) => setServerError(toApiError(error).message),
  });

  async function onSubmit(values: QuotationSettingsSubmitValues) {
    await updateMutation.mutateAsync(values);
  }

  if (query.isPending) {
    return <SettingsPageShell title="Quotation Settings" description="Manage numbering, defaults and PDF display preferences."><Stack spacing={2}>{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} height={56} />)}</Stack></SettingsPageShell>;
  }

  if (query.isError) {
    return (
      <SettingsPageShell title="Quotation Settings" description="Manage numbering, defaults and PDF display preferences.">
        <ErrorState message={toApiError(query.error).message} />
        <AppButton onClick={() => void query.refetch()} variant="outlined">Retry</AppButton>
      </SettingsPageShell>
    );
  }

  const isBusy = updateMutation.isPending;

  return (
    <SettingsPageShell title="Quotation Settings" description="Manage numbering, defaults and PDF display preferences.">
      <Stack component="form" spacing={2} onSubmit={(event) => void form.handleSubmit(onSubmit)(event)} noValidate>
        <ServerErrorAlert message={serverError} />
        {form.formState.isDirty ? <Alert severity="info">You have unsaved changes.</Alert> : null}
        <SettingsSection title="Quotation numbering">
          <TwoColumnGrid>
            <ControlledTextField control={form.control} name="quotationPrefix" label="Quotation prefix" required disabled={isBusy} />
            <QuotationTextField form={form} name="financialYearFormat" label="Financial year format" required disabled={isBusy} select>
              <MenuItem value="YYYY-YY">YYYY-YY</MenuItem>
            </QuotationTextField>
            <QuotationTextField form={form} name="nextSequenceNumber" label="Next sequence number" required disabled={isBusy} type="number" />
            <QuotationTextField form={form} name="sequenceResetRule" label="Sequence reset rule" required disabled={isBusy} select>
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
            <QuotationTextField form={form} name="defaultGstRate" label="Default GST rate" required disabled={isBusy} helperText="Stored and submitted as a decimal string." />
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
        <FormActions
          submitLabel={isBusy ? 'Saving' : 'Save changes'}
          isSubmitting={isBusy}
          isSubmitDisabled={isBusy || !form.formState.isDirty}
          isCancelDisabled={isBusy || !form.formState.isDirty}
          onCancel={() => form.reset(toQuotationFormValues(query.data))}
          cancelLabel="Reset changes"
          cancelButtonProps={{ type: 'button', variant: 'outlined' }}
        />
      </Stack>
      <AppSnackbar open={successMessage !== null} message={successMessage} onClose={() => setSuccessMessage(null)} />
    </SettingsPageShell>
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
