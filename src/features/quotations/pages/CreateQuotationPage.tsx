import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@features/auth';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { readAssistantDraft } from '@shared/routing/assistantDraft';

import { getQuotationSettingsRequest } from '@features/settings';
import { type ApiFieldErrors } from '@shared/api/apiClient';
import { paths } from '@shared/routing/paths';
import { useSaveAndReturn } from '@shared/routing/returnNavigation';
import { PageContainer, PageHeader } from '@shared/ui/layout';
import { createQuotationRequest } from '../api/quotations.api';
import { QuotationForm } from '../components/QuotationForm';
import { quotationsQueryKeys } from '../model/quotations.query-keys';
import type { QuotationFormSubmitValues } from '../model/quotations.schema';

export function CreateQuotationPage() {
  const { cancel, saved, failed, hasSaved } = useSaveAndReturn(paths.quotations);
  const { state } = useLocation(); const { user } = useAuth(); const firmId = useFirmId();
  const assistantDraft = readAssistantDraft(state, firmId, user?.id, 'QUOTATION');
  const queryClient = useQueryClient();

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
      return saved(`Quotation ${created.quotationNumber} created successfully.`, () => queryClient.invalidateQueries({ queryKey: quotationsQueryKeys.all }));
    },
    onError: (error) => {
      const apiError = failed(error);
      if (apiError.cancelled) return;
      setServerError(apiError.message);
      setFieldErrors(apiError.fieldErrors);
    },
  });

  const initialValues: Partial<QuotationFormSubmitValues> = {
    ...(assistantDraft ? { companyId: assistantDraft.companyId, items: assistantDraft.lines.map((line, index) => ({ itemId: line.itemId, itemName: line.itemName, measurementUnit: line.measurementUnit, quantity: line.quantity, unitRate: line.unitRate, gstRate: line.taxRate, discountType: line.discountType, discountValue: line.discountValue, sortOrder: index })) } : {}),
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

      <QuotationForm hasSaved={hasSaved}
        key={`${firmId}:${user?.id}`}
        initialValues={initialValues}
        defaultValidityDays={quotationSettings?.defaultValidityDays ?? 30}
        isSubmitting={createMutation.isPending}
        serverError={serverError}
        fieldErrors={fieldErrors}
        onCancel={cancel}
        onSubmit={(values) => {
          if (!createMutation.isPending) {
            setServerError(null);
            setFieldErrors({});
            createMutation.mutate(values);
          }
        }}
      />

    </PageContainer>
  );
}
