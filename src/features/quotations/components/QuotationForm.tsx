import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Controller, FormProvider, type Path, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { getItemOptionsRequest } from '../../items/api/items.api';
import { listBankDetailsRequest } from '../../settings/api/bank-details.api';
import { toApiError, type ApiFieldErrors } from '@shared/api/apiClient';
import { FormActions } from '@shared/forms';
import { ControlledTextField } from '@shared/forms/controlled';
import { ServerErrorAlert } from '@shared/ui/feedback';
import { applyApiFieldErrors } from '@shared/forms/formErrors';
import { calculatePreviewRequest } from '../api/quotations.api';
import type { CalculatedQuotationTotals, CalculationPreviewInput, QuotationDetail } from '../quotations.types';
import { quotationFormSchema, type QuotationFormSubmitValues } from '../quotations.schema';
import {
  addCalendarDaysToDateOnly,
  buildCalculationPreviewInput,
  compareDateOnly,
  formatDateOnlyLocal,
  formatDiscountTypeLabel,
  formatTaxModeLabel,
} from '../quotations.utils';
import { QuotationCustomerSection } from './QuotationCustomerSection';
import { QuotationItemsField } from './QuotationItemsField';
import { QuotationTotalsSummary } from './QuotationTotalsSummary';

const EMPTY_FIELD_ERRORS: ApiFieldErrors = {};

type QuotationFormProps = {
  initialValues?: Partial<QuotationFormSubmitValues>;
  editingQuotation?: QuotationDetail | null;
  isSubmitting?: boolean;
  serverError?: string | null;
  fieldErrors?: ApiFieldErrors;
  defaultValidityDays?: number;
  onCancel: () => void;
  onSubmit: (values: QuotationFormSubmitValues) => void;
};

export function QuotationForm({
  initialValues,
  editingQuotation,
  isSubmitting = false,
  serverError = null,
  fieldErrors = EMPTY_FIELD_ERRORS,
  defaultValidityDays = 30,
  onCancel,
  onSubmit,
}: QuotationFormProps) {
  const defaultQuoDate = formatDateOnlyLocal(new Date());
  const defaultValidUntil = addCalendarDaysToDateOnly(defaultQuoDate, defaultValidityDays);
  const autoValidUntilRef = useRef(defaultValidUntil);

  const methods = useForm<QuotationFormSubmitValues>({
    resolver: zodResolver(quotationFormSchema),
    defaultValues: {
      companyId: initialValues?.companyId || (0 as unknown as number),
      companyContactId: initialValues?.companyContactId || null,
      billingAddressId: initialValues?.billingAddressId || null,
      shippingAddressId: initialValues?.shippingAddressId || null,
      quotationDate: initialValues?.quotationDate || defaultQuoDate,
      validUntil: initialValues?.validUntil || defaultValidUntil,
      customerReference: initialValues?.customerReference || '',
      internalReference: initialValues?.internalReference || '',
      currency: initialValues?.currency || 'INR',
      taxMode: initialValues?.taxMode || 'CGST_SGST',
      quotationDiscountType: initialValues?.quotationDiscountType || 'NONE',
      quotationDiscountValue: initialValues?.quotationDiscountValue || 0,
      freightAmount: initialValues?.freightAmount || 0,
      otherCharges: initialValues?.otherCharges || 0,
      bankDetailId: initialValues?.bankDetailId || null,
      deliveryTerms: initialValues?.deliveryTerms || '',
      dispatchTerms: initialValues?.dispatchTerms || '',
      paymentTerms: initialValues?.paymentTerms || '',
      taxTerms: initialValues?.taxTerms || '',
      freightTerms: initialValues?.freightTerms || '',
      warrantyTerms: initialValues?.warrantyTerms || '',
      remarks: initialValues?.remarks || '',
      termsAndConditions: initialValues?.termsAndConditions || '',
      internalNotes: initialValues?.internalNotes || '',
      items: initialValues?.items && initialValues.items.length > 0 ? initialValues.items : [
        {
          itemId: null,
          lineNumber: 1,
          itemName: '',
          description: '',
          measurementUnit: 'NOS',
          quantity: 1,
          unitRate: 0,
          discountType: 'NONE',
          discountValue: 0,
          gstRate: 18,
          sortOrder: 0,
        },
      ],
    },
  });

  const { handleSubmit, control } = methods;
  const serverFieldNamesRef = useRef<Array<Path<QuotationFormSubmitValues>>>([]);

  useEffect(() => {
    if (serverFieldNamesRef.current.length > 0) {
      methods.clearErrors(serverFieldNamesRef.current);
    }

    applyApiFieldErrors(methods, fieldErrors);
    serverFieldNamesRef.current = Object.keys(fieldErrors) as Array<Path<QuotationFormSubmitValues>>;
  }, [fieldErrors, methods]);

  // Master Item options
  const { data: itemOptions = [] } = useQuery({
    queryKey: ['items', 'options'],
    queryFn: () => getItemOptionsRequest({ limit: 100 }),
  });

  // Bank details list
  const { data: bankDetails = [] } = useQuery({
    queryKey: ['settings', 'bank-details'],
    queryFn: () => listBankDetailsRequest(),
  });

  // Calculation Preview state
  const [calculatedTotals, setCalculatedTotals] = useState<CalculatedQuotationTotals | null>(null);
  const [previewState, setPreviewState] = useState<'empty' | 'calculating' | 'ready' | 'invalid' | 'error'>('empty');
  const [previewMessage, setPreviewMessage] = useState<string | null>(null);
  const latestRequestIdRef = useRef(0);
  const latestPayloadKeyRef = useRef<string | null>(null);

  const previewMutation = useMutation({
    mutationFn: ({ payload, requestId }: { payload: CalculationPreviewInput; requestId: number }) =>
      calculatePreviewRequest(payload).then((data) => ({ data, requestId })),
    onSuccess: ({ data, requestId }) => {
      if (requestId === latestRequestIdRef.current) {
        setCalculatedTotals(data);
        setPreviewState('ready');
        setPreviewMessage(null);
      }
    },
    onError: (error, variables) => {
      if (variables.requestId !== latestRequestIdRef.current) return;

      const apiError = toApiError(error);
      if (apiError.cancelled) {
        setPreviewState(calculatedTotals ? 'ready' : 'empty');
        setPreviewMessage(null);
        return;
      }

      setPreviewState('error');
      setPreviewMessage(apiError.message || 'Calculation preview is unavailable. Update the inputs to retry.');
    },
  });
  const { mutate: calculatePreview, isPending: isPreviewCalculating } = previewMutation;

  const watchedCalculationValues = useWatch({
    control,
    name: [
      'items',
      'taxMode',
      'quotationDiscountType',
      'quotationDiscountValue',
      'freightAmount',
      'otherCharges',
    ],
  });
  const watchedQuotationDate = useWatch({ control, name: 'quotationDate' });
  const watchedValidUntil = useWatch({ control, name: 'validUntil' });
  const watchedTaxMode = watchedCalculationValues[1];
  const watchedDiscType = watchedCalculationValues[2];
  const watchedCurrency = useWatch({ control, name: 'currency' });

  useEffect(() => {
    if (!watchedQuotationDate) return;

    const nextAutoValidUntil = addCalendarDaysToDateOnly(watchedQuotationDate, defaultValidityDays);
    const shouldMaintainAutoValidity =
      !editingQuotation &&
      watchedValidUntil === autoValidUntilRef.current;

    if (shouldMaintainAutoValidity) {
      autoValidUntilRef.current = nextAutoValidUntil;
      methods.setValue('validUntil', nextAutoValidUntil, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: true,
      });
      return;
    }

    if (watchedValidUntil && compareDateOnly(watchedValidUntil, watchedQuotationDate) < 0) {
      methods.setValue('validUntil', null, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    }
  }, [defaultValidityDays, editingQuotation, methods, watchedQuotationDate, watchedValidUntil]);

  // Debounced calculation preview trigger with race protection
  useEffect(() => {
    const [items, taxMode, quotationDiscountType, quotationDiscountValue, freightAmount, otherCharges] =
      watchedCalculationValues;
    const payload = buildCalculationPreviewInput({
      items,
      taxMode,
      quotationDiscountType,
      quotationDiscountValue,
      freightAmount,
      otherCharges,
    });

    if (!payload) {
      latestRequestIdRef.current += 1;
      latestPayloadKeyRef.current = null;
      if (calculatedTotals) {
        setPreviewState('invalid');
        setPreviewMessage('Current line-item inputs are incomplete or invalid. Previous valid totals remain visible.');
      } else {
        setPreviewState('empty');
        setPreviewMessage('Add a valid line item to generate calculation preview.');
      }
      return;
    }

    const payloadKey = JSON.stringify(payload);
    if (payloadKey === latestPayloadKeyRef.current) return;
    latestPayloadKeyRef.current = payloadKey;

    const currentRequestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = currentRequestId;
    setPreviewState(calculatedTotals ? 'ready' : 'calculating');
    setPreviewMessage(calculatedTotals ? 'Updating totals from the latest inputs...' : null);

    const timer = setTimeout(() => {
      calculatePreview({
        payload,
        requestId: currentRequestId,
      });
    }, 350);

    return () => clearTimeout(timer);
  }, [
    watchedCalculationValues,
    calculatePreview,
    calculatedTotals,
  ]);

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate aria-busy={isSubmitting || isPreviewCalculating}>
        <Stack spacing={3}>
          <ServerErrorAlert message={serverError} />

          {/* Header Info Banner if editing */}
          {editingQuotation ? (
            <Card variant="outlined" sx={{ bgcolor: 'grey.50', p: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Editing Draft <strong>{editingQuotation.quotationNumber}</strong> (Rev #{editingQuotation.revisionNumber}). A version snapshot will be preserved automatically upon saving updates.
              </Typography>
            </Card>
          ) : (
            <Card variant="outlined" sx={{ bgcolor: 'grey.50', p: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Quotation number will be generated automatically upon saving in <code>BUMINEX/2026-27/000001</code> format. Initial status will be set to <strong>Draft</strong>.
              </Typography>
            </Card>
          )}

          {/* Customer Selection */}
          <QuotationCustomerSection />

          {/* Dates & Currency / Tax Settings */}
          <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: 'background.paper' }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                Dates & Tax Configuration
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr 1fr' }, gap: 2 }}>
                <Controller
                  name="quotationDate"
                  control={control}
                  render={({ field, fieldState: { error } }) => (
                    <TextField
                      {...field}
                      size="small"
                      type="date"
                      label="Quotation Date *"
                      InputLabelProps={{ shrink: true }}
                      error={Boolean(error)}
                      helperText={error?.message}
                    />
                  )}
                />

                <Controller
                  name="validUntil"
                  control={control}
                  render={({ field, fieldState: { error } }) => (
                    <TextField
                      {...field}
                      value={field.value || ''}
                      size="small"
                      type="date"
                      label="Valid Until"
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ min: watchedQuotationDate || undefined }}
                      error={Boolean(error)}
                      helperText={error?.message || (watchedQuotationDate ? `Must be on or after ${watchedQuotationDate}.` : undefined)}
                    />
                  )}
                />

                <ControlledTextField
                  control={control}
                  name="currency"
                  size="small"
                  label="Currency Code"
                  placeholder="INR"
                  inputProps={{ maxLength: 3 }}
                />

                <Controller
                  name="taxMode"
                  control={control}
                  render={({ field }) => (
                    <FormControl size="small" fullWidth>
                      <InputLabel id="tax-mode-label">Tax Mode</InputLabel>
                      <Select {...field} labelId="tax-mode-label" label="Tax Mode">
                        <MenuItem value="CGST_SGST">{formatTaxModeLabel('CGST_SGST')}</MenuItem>
                        <MenuItem value="IGST">{formatTaxModeLabel('IGST')}</MenuItem>
                        <MenuItem value="NONE">{formatTaxModeLabel('NONE')}</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Box>
            </CardContent>
          </Card>

          {/* Line Items Editor */}
          <QuotationItemsField
            itemOptions={itemOptions}
            calculatedTotals={calculatedTotals}
            currency={watchedCurrency}
          />

          {/* Header Discounts & Extra Charges */}
          <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: 'background.paper' }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                Quotation Discounts & Freight
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr 1fr' }, gap: 2 }}>
                <Controller
                  name="quotationDiscountType"
                  control={control}
                  render={({ field }) => (
                    <FormControl size="small" fullWidth>
                      <InputLabel id="quo-disc-type-label">Header Discount</InputLabel>
                      <Select {...field} labelId="quo-disc-type-label" label="Header Discount">
                        <MenuItem value="NONE">{formatDiscountTypeLabel('NONE')}</MenuItem>
                        <MenuItem value="PERCENTAGE">{formatDiscountTypeLabel('PERCENTAGE')}</MenuItem>
                        <MenuItem value="FIXED">{formatDiscountTypeLabel('FIXED')}</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />

                <Controller
                  name="quotationDiscountValue"
                  control={control}
                  render={({ field, fieldState: { error } }) => (
                    <TextField
                      {...field}
                      size="small"
                      type="number"
                      label="Discount Value"
                      disabled={watchedDiscType === 'NONE'}
                      inputProps={{ step: '0.01', min: '0' }}
                      error={Boolean(error)}
                      helperText={error?.message}
                    />
                  )}
                />

                <Controller
                  name="freightAmount"
                  control={control}
                  render={({ field, fieldState: { error } }) => (
                    <TextField
                      {...field}
                      size="small"
                      type="number"
                      label="Freight Amount"
                      inputProps={{ step: '0.01', min: '0' }}
                      error={Boolean(error)}
                      helperText={error?.message}
                    />
                  )}
                />

                <Controller
                  name="otherCharges"
                  control={control}
                  render={({ field, fieldState: { error } }) => (
                    <TextField
                      {...field}
                      size="small"
                      type="number"
                      label="Other Charges"
                      inputProps={{ step: '0.01', min: '0' }}
                      error={Boolean(error)}
                      helperText={error?.message}
                    />
                  )}
                />
              </Box>
            </CardContent>
          </Card>

          {/* Totals Summary */}
          <QuotationTotalsSummary
            totals={calculatedTotals}
            currency={watchedCurrency}
            taxMode={watchedTaxMode}
            quotationDiscountType={watchedDiscType}
            isCalculating={isPreviewCalculating || previewState === 'calculating'}
            state={previewState}
            message={previewMessage}
          />

          {/* Bank Details & Terms */}
          <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: 'background.paper' }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                Bank Account & Terms & Conditions
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr' }, gap: 2, mb: 2 }}>
                <Controller
                  name="bankDetailId"
                  control={control}
                  render={({ field }) => (
                    <FormControl size="small" fullWidth>
                      <InputLabel id="bank-detail-select-label">Bank Account</InputLabel>
                      <Select
                        {...field}
                        labelId="bank-detail-select-label"
                        label="Bank Account"
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                      >
                        <MenuItem value="">Do Not Include Bank Details</MenuItem>
                        {bankDetails.map((bank) => (
                          <MenuItem key={bank.id} value={bank.id}>
                            {bank.bankName} - {bank.accountName} (Acc: {bank.accountNumber.slice(-4).padStart(bank.accountNumber.length, '*')}) {bank.isDefault ? '[Default]' : ''}
                          </MenuItem>
                        ))}
                      </Select>
                      <FormHelperText>Select company bank account to display on printed quotation output.</FormHelperText>
                    </FormControl>
                  )}
                />
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <ControlledTextField
                  control={control}
                  name="remarks"
                  size="small"
                  multiline
                  rows={3}
                  label="Customer Remarks"
                  placeholder="Remarks displayed on quotation..."
                />

                <ControlledTextField
                  control={control}
                  name="termsAndConditions"
                  size="small"
                  multiline
                  rows={3}
                  label="Terms & Conditions"
                  placeholder="Specific terms and conditions..."
                />

                <ControlledTextField
                  control={control}
                  name="internalNotes"
                  size="small"
                  multiline
                  rows={2}
                  label="Internal Notes"
                  placeholder="Internal administrative notes (not shown to customer)..."
                  sx={{ gridColumn: { xs: '1 / -1', sm: '1 / -1' } }}
                />
              </Box>
            </CardContent>
          </Card>

          {/* Form Action Buttons */}
          <Box sx={{ pt: 1 }}>
            <FormActions
              spacing={2}
              isSubmitting={isSubmitting}
              onCancel={onCancel}
              submitLabel={isSubmitting ? 'Saving quotation...' : editingQuotation ? 'Update Draft Quotation' : 'Save Quotation Draft'}
              cancelButtonProps={{ color: 'inherit' }}
              submitButtonProps={{ color: 'primary' }}
            />
          </Box>
        </Stack>
      </form>
    </FormProvider>
  );
}
