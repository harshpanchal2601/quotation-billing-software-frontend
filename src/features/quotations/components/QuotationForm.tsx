import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
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
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { getItemOptionsRequest } from '../../items/api/items.api';
import { listBankDetailsRequest } from '../../settings/api/bank-details.api';
import { calculatePreviewRequest } from '../api/quotations.api';
import type { CalculatedQuotationTotals, CalculationPreviewInput, QuotationDetail } from '../quotations.types';
import { quotationFormSchema, type QuotationFormSubmitValues } from '../quotations.schema';
import { formatDiscountTypeLabel, formatTaxModeLabel } from '../quotations.utils';
import { QuotationCustomerSection } from './QuotationCustomerSection';
import { QuotationItemsField } from './QuotationItemsField';
import { QuotationTotalsSummary } from './QuotationTotalsSummary';

type QuotationFormProps = {
  initialValues?: Partial<QuotationFormSubmitValues>;
  editingQuotation?: QuotationDetail | null;
  isSubmitting?: boolean;
  onCancel: () => void;
  onSubmit: (values: QuotationFormSubmitValues) => void;
};

export function QuotationForm({
  initialValues,
  editingQuotation,
  isSubmitting = false,
  onCancel,
  onSubmit,
}: QuotationFormProps) {
  const defaultQuoDate = new Date().toISOString().split('T')[0]!;
  const defaultValidUntil = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]!;

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

  const { watch, handleSubmit, control } = methods;

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
  const latestRequestIdRef = useRef(0);

  const previewMutation = useMutation({
    mutationFn: ({ payload, requestId }: { payload: CalculationPreviewInput; requestId: number }) =>
      calculatePreviewRequest(payload).then((data) => ({ data, requestId })),
    onSuccess: ({ data, requestId }) => {
      if (requestId === latestRequestIdRef.current) {
        setCalculatedTotals(data);
      }
    },
  });
  const { mutate: calculatePreview, isPending: isPreviewCalculating } = previewMutation;

  const watchedItems = watch('items');
  const watchedTaxMode = watch('taxMode');
  const watchedDiscType = watch('quotationDiscountType');
  const watchedDiscVal = watch('quotationDiscountValue');
  const watchedFreight = watch('freightAmount');
  const watchedOtherCharges = watch('otherCharges');

  // Debounced calculation preview trigger with race protection
  useEffect(() => {
    const validLines = (watchedItems || []).filter(
      (line) =>
        line &&
        Number(line.quantity) > 0 &&
        Number(line.unitRate) > 0 &&
        String(line.itemName || line.description || '').trim().length > 0,
    );

    if (validLines.length === 0) {
      latestRequestIdRef.current += 1;
      setCalculatedTotals(null);
      return;
    }

    const currentRequestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = currentRequestId;

    const timer = setTimeout(() => {
      calculatePreview({
        payload: {
          taxMode: watchedTaxMode,
          quotationDiscountType: watchedDiscType,
          quotationDiscountValue: watchedDiscVal,
          freightAmount: watchedFreight,
          otherCharges: watchedOtherCharges,
          items: validLines.map((l, i) => ({
            itemId: l.itemId,
            lineNumber: i + 1,
            itemName: l.itemName || `Item #${i + 1}`,
            description: l.description,
            measurementUnit: l.measurementUnit || 'NOS',
            quantity: l.quantity,
            unitRate: l.unitRate,
            discountType: l.discountType,
            discountValue: l.discountValue,
            gstRate: l.gstRate,
            sortOrder: i,
          })),
        },
        requestId: currentRequestId,
      });
    }, 350);

    return () => clearTimeout(timer);
  }, [
    watchedItems,
    watchedTaxMode,
    watchedDiscType,
    watchedDiscVal,
    watchedFreight,
    watchedOtherCharges,
    calculatePreview,
  ]);

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack spacing={3}>
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
                      error={Boolean(error)}
                      helperText={error?.message}
                    />
                  )}
                />

                <Controller
                  name="currency"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      size="small"
                      label="Currency Code"
                      placeholder="INR"
                      inputProps={{ maxLength: 3 }}
                    />
                  )}
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
            currency={watch('currency')}
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
            currency={watch('currency')}
            taxMode={watchedTaxMode}
            quotationDiscountType={watchedDiscType}
            isCalculating={isPreviewCalculating}
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
                <Controller
                  name="remarks"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      value={field.value || ''}
                      size="small"
                      multiline
                      rows={3}
                      label="Customer Remarks"
                      placeholder="Remarks displayed on quotation..."
                    />
                  )}
                />

                <Controller
                  name="termsAndConditions"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      value={field.value || ''}
                      size="small"
                      multiline
                      rows={3}
                      label="Terms & Conditions"
                      placeholder="Specific terms and conditions..."
                    />
                  )}
                />

                <Controller
                  name="internalNotes"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      value={field.value || ''}
                      size="small"
                      multiline
                      rows={2}
                      label="Internal Notes"
                      placeholder="Internal administrative notes (not shown to customer)..."
                      sx={{ gridColumn: { xs: '1 / -1', sm: '1 / -1' } }}
                    />
                  )}
                />
              </Box>
            </CardContent>
          </Card>

          {/* Form Action Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, pt: 1 }}>
            <Button color="inherit" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" color="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving Quotation...' : editingQuotation ? 'Update Draft Quotation' : 'Save Quotation Draft'}
            </Button>
          </Box>
        </Stack>
      </form>
    </FormProvider>
  );
}
