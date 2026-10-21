import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { getQuotationSettingsRequest } from '@features/settings';
import { toApiError, type ApiFieldErrors } from '@shared/api/apiClient';
import { AppSnackbar } from '@shared/ui/feedback';
import { PageContainer, PageHeader } from '@shared/ui/layout';
import { createQuotationRequest } from '../api/quotations.api';
import { QuotationForm } from '../components/QuotationForm';
import { quotationsQueryKeys } from '../model/quotations.query-keys';
import type { QuotationFormSubmitValues } from '../model/quotations.schema';

export function CreateQuotationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [feedback, setFeedback] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ApiFieldErrors>({});

  // Load quotation settings for defaults
  const { data: quotationSettings } = useQuery({
    queryKey: ['settings', 'quotation'],
    queryFn: getQuotationSettingsRequest,
  });

  const createMutation = useMutation({
    mutationFn: (values: QuotationFormSubmitValues) =>
      createQuotationRequest({
        ...values,
        quotationDate: values.quotationDate,
        validUntil: values.validUntil || null,
        items: values.items.map((line, i) => ({
          itemId: line.itemId || null,
          lineNumber: i + 1,
          itemName: line.itemName || undefined,
          description: line.description || null,
          measurementUnit: line.measurementUnit || undefined,
          quantity: line.quantity,
          unitRate: line.unitRate,
          discountType: line.discountType,
          discountValue: line.discountValue,
          gstRate: line.gstRate,
          sortOrder: i,
        })),
      }),
    onSuccess: (created) => {
      setServerError(null);
      setFieldErrors({});
      setFeedback({ open: true, message: `Quotation ${created.quotationNumber} created successfully!`, severity: 'success' });
      queryClient.invalidateQueries({ queryKey: quotationsQueryKeys.all });
      navigate(`/quotations/${created.id}`);
    },
    onError: (error) => {
      const apiError = toApiError(error);
      if (apiError.cancelled) return;
      setServerError(apiError.message);
      setFieldErrors(apiError.fieldErrors);
    },
  });

  const initialValues: Partial<QuotationFormSubmitValues> = {
    taxMode: quotationSettings?.defaultTaxMode || 'CGST_SGST',
    deliveryTerms: quotationSettings?.defaultDeliveryTerms || '',
    dispatchTerms: quotationSettings?.defaultDispatchTerms || '',
    paymentTerms: quotationSettings?.defaultPaymentTerms || '',
    freightTerms: quotationSettings?.defaultFreightTerms || '',
    warrantyTerms: quotationSettings?.defaultWarrantyTerms || '',
    remarks: quotationSettings?.defaultRemarks || '',
    termsAndConditions: quotationSettings?.defaultTermsAndConditions || '',
  };

  return (
    <PageContainer maxWidth={1200} sx={{ mx: 'auto' }}>
      <PageHeader
        title="Create New Quotation"
        titleTypographyProps={{ variant: 'h5', fontWeight: 700 }}
        description="Fill in customer selection, line items, and terms. Quotation number will be generated automatically."
        descriptionTypographyProps={{ variant: 'body2' }}
      />

      <QuotationForm
        initialValues={initialValues}
        defaultValidityDays={quotationSettings?.defaultValidityDays ?? 30}
        isSubmitting={createMutation.isPending}
        serverError={serverError}
        fieldErrors={fieldErrors}
        onCancel={() => navigate('/quotations')}
        onSubmit={(values) => {
          if (!createMutation.isPending) {
            setServerError(null);
            setFieldErrors({});
            createMutation.mutate(values);
          }
        }}
      />

      <AppSnackbar
        open={feedback.open}
        autoHideDuration={4000}
        message={feedback.message}
        severity={feedback.severity}
        onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
      />
    </PageContainer>
  );
}
