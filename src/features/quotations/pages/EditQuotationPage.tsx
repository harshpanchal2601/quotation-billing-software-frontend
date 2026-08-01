import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ErrorState } from '@shared/components/common/ErrorState';
import { toApiError, type ApiFieldErrors } from '@shared/api/apiClient';
import { AppButton } from '@shared/ui/actions';
import { AppSnackbar } from '@shared/ui/feedback';
import { PageContainer, PageHeader } from '@shared/ui/layout';
import { getQuotationRequest, updateQuotationRequest } from '../api/quotations.api';
import { QuotationForm } from '../components/QuotationForm';
import { quotationsQueryKeys } from '../quotations.query-keys';
import type { QuotationFormSubmitValues } from '../quotations.schema';
import { formatQuotationStatusLabel } from '../quotations.utils';

export function EditQuotationPage() {
  const { id } = useParams<{ id: string }>();
  const quotationId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [feedback, setFeedback] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ApiFieldErrors>({});

  const { data: quotation, isLoading, isError, error, refetch } = useQuery({
    queryKey: quotationsQueryKeys.detail(quotationId),
    queryFn: () => getQuotationRequest(quotationId),
    enabled: Boolean(quotationId && quotationId > 0),
  });

  const updateMutation = useMutation({
    mutationFn: (values: QuotationFormSubmitValues) =>
      updateQuotationRequest(quotationId, {
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
    onSuccess: (updated) => {
      setServerError(null);
      setFieldErrors({});
      setFeedback({ open: true, message: `Quotation ${updated.quotationNumber} updated successfully!`, severity: 'success' });
      queryClient.invalidateQueries({ queryKey: quotationsQueryKeys.all });
      navigate(`/quotations/${updated.id}`);
    },
    onError: (error) => {
      const apiError = toApiError(error);
      if (apiError.cancelled) return;
      setServerError(apiError.message);
      setFieldErrors(apiError.fieldErrors);
    },
  });

  if (isLoading) {
    return (
      <PageContainer maxWidth={1200} sx={{ p: 3, mx: 'auto' }}>
        <Skeleton variant="text" width={240} height={40} />
        <Skeleton variant="rectangular" height={400} sx={{ mt: 2, borderRadius: 2 }} />
      </PageContainer>
    );
  }

  if (isError || !quotation) {
    return (
      <ErrorState message={toApiError(error).message} onRetry={refetch} />
    );
  }

  if (!quotation.canEdit) {
    const latestRevision = quotation.latestRevision;
    return (
      <PageContainer maxWidth={800} sx={{ p: 3, mx: 'auto' }}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          Quotation <strong>{quotation.quotationNumber}</strong> Revision #{quotation.revisionNumber} is currently in status <strong>{formatQuotationStatusLabel(quotation.status)}</strong> and can no longer be edited. Only the latest Draft revision is editable.
        </Alert>
        <AppButton
          variant="contained"
          onClick={() => navigate(`/quotations/${latestRevision?.id ?? quotation.id}`)}
        >
          {latestRevision && latestRevision.id !== quotation.id ? 'View Latest Revision' : 'View Quotation Details'}
        </AppButton>
      </PageContainer>
    );
  }

  const initialValues: Partial<QuotationFormSubmitValues> = {
    companyId: quotation.companyId,
    companyContactId: quotation.companyContactId,
    billingAddressId: quotation.billingAddressId,
    shippingAddressId: quotation.shippingAddressId,
    quotationDate: quotation.quotationDate.split('T')[0],
    validUntil: quotation.validUntil ? quotation.validUntil.split('T')[0] : null,
    customerReference: quotation.customerReference || '',
    internalReference: quotation.internalReference || '',
    currency: quotation.currency,
    taxMode: quotation.taxMode,
    quotationDiscountType: quotation.quotationDiscountType,
    quotationDiscountValue: Number(quotation.quotationDiscountValue),
    freightAmount: Number(quotation.freightAmount),
    otherCharges: Number(quotation.otherCharges),
    deliveryTerms: quotation.deliveryTerms || '',
    dispatchTerms: quotation.dispatchTerms || '',
    paymentTerms: quotation.paymentTerms || '',
    taxTerms: quotation.taxTerms || '',
    freightTerms: quotation.freightTerms || '',
    warrantyTerms: quotation.warrantyTerms || '',
    remarks: quotation.remarks || '',
    termsAndConditions: quotation.termsAndConditions || '',
    internalNotes: quotation.internalNotes || '',
    items: quotation.items.map((item) => ({
      itemId: item.itemId,
      lineNumber: item.lineNumber,
      itemName: item.itemNameSnapshot,
      description: item.descriptionSnapshot || '',
      measurementUnit: item.measurementUnitSnapshot,
      quantity: Number(item.quantity),
      unitRate: Number(item.unitRate),
      discountType: item.discountType,
      discountValue: Number(item.discountValue),
      gstRate: Number(item.gstRate),
      sortOrder: item.sortOrder,
    })),
  };

  return (
    <PageContainer maxWidth={1200} sx={{ mx: 'auto' }}>
      <PageHeader
        title={`Edit Draft Quotation — ${quotation.quotationNumber} Revision #${quotation.revisionNumber}`}
        titleTypographyProps={{ variant: 'h5', fontWeight: 700 }}
        description="Update customer details, line items or charges. A version snapshot will be saved automatically upon submission."
        descriptionTypographyProps={{ variant: 'body2' }}
      />

      <QuotationForm
        initialValues={initialValues}
        editingQuotation={quotation}
        isSubmitting={updateMutation.isPending}
        serverError={serverError}
        fieldErrors={fieldErrors}
        onCancel={() => navigate(`/quotations/${quotation.id}`)}
        onSubmit={(values) => {
          if (!updateMutation.isPending) {
            setServerError(null);
            setFieldErrors({});
            updateMutation.mutate(values);
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
