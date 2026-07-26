import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { ErrorState } from '../../../components/common/ErrorState';
import { toApiError } from '../../../services/apiClient';
import {
  getQuotationSettingsRequest,
  quotationSettingsQueryKey,
  updateQuotationSettingsRequest,
} from '../api/quotation-settings.api';
import { SettingsNavigation } from '../components/SettingsNavigation';
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
        <Button onClick={() => void query.refetch()} variant="outlined">Retry</Button>
      </SettingsPageShell>
    );
  }

  const isBusy = updateMutation.isPending;

  return (
    <SettingsPageShell title="Quotation Settings" description="Manage numbering, defaults and PDF display preferences.">
      <Stack component="form" spacing={2} onSubmit={(event) => void form.handleSubmit(onSubmit)(event)} noValidate>
        {serverError ? <Alert severity="error">{serverError}</Alert> : null}
        {form.formState.isDirty ? <Alert severity="info">You have unsaved changes.</Alert> : null}
        <SettingsSection title="Quotation numbering">
          <TwoColumnGrid>
            <QuotationTextField form={form} name="quotationPrefix" label="Quotation prefix" required disabled={isBusy} />
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
            <QuotationTextField form={form} name="defaultDeliveryTerms" label="Delivery terms" disabled={isBusy} multiline minRows={3} />
            <QuotationTextField form={form} name="defaultDispatchTerms" label="Dispatch terms" disabled={isBusy} multiline minRows={3} />
            <QuotationTextField form={form} name="defaultPaymentTerms" label="Payment terms" disabled={isBusy} multiline minRows={3} />
            <QuotationTextField form={form} name="defaultFreightTerms" label="Freight terms" disabled={isBusy} multiline minRows={3} />
            <QuotationTextField form={form} name="defaultWarrantyTerms" label="Warranty terms" disabled={isBusy} multiline minRows={3} />
          </TwoColumnGrid>
        </SettingsSection>
        <SettingsSection title="Default content">
          <Stack spacing={2}>
            <QuotationTextField form={form} name="defaultRemarks" label="Default remarks" disabled={isBusy} multiline minRows={4} />
            <QuotationTextField form={form} name="defaultTermsAndConditions" label="Default terms and conditions" disabled={isBusy} multiline minRows={6} />
          </Stack>
        </SettingsSection>
        <SettingsSection title="PDF display preferences">
          <Stack spacing={1}>
            <Controller
              name="showBankDetails"
              control={form.control}
              render={({ field }) => (
                <FormControlLabel control={<Switch checked={field.value} onChange={(event) => field.onChange(event.target.checked)} disabled={isBusy} />} label="Show bank details on quotation PDFs" />
              )}
            />
            <Controller
              name="showAmountInWords"
              control={form.control}
              render={({ field }) => (
                <FormControlLabel control={<Switch checked={field.value} onChange={(event) => field.onChange(event.target.checked)} disabled={isBusy} />} label="Show amount in words on quotation PDFs" />
              )}
            />
          </Stack>
        </SettingsSection>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="flex-end">
          <Button type="button" variant="outlined" disabled={isBusy || !form.formState.isDirty} onClick={() => form.reset(toQuotationFormValues(query.data))}>Reset changes</Button>
          <Button type="submit" variant="contained" disabled={isBusy || !form.formState.isDirty}>{isBusy ? 'Saving' : 'Save changes'}</Button>
        </Stack>
      </Stack>
      <Snackbar open={successMessage !== null} autoHideDuration={5000} onClose={() => setSuccessMessage(null)}>
        <Alert severity="success" variant="filled" onClose={() => setSuccessMessage(null)}>{successMessage}</Alert>
      </Snackbar>
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
      <SettingsNavigation />
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
