import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ErrorState } from '../../../components/common/ErrorState';
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
      setFeedback({ open: true, message: `Quotation ${updated.quotationNumber} updated successfully!`, severity: 'success' });
      queryClient.invalidateQueries({ queryKey: quotationsQueryKeys.all });
      navigate(`/quotations/${updated.id}`);
    },
    onError: (err: Error) => {
      setFeedback({ open: true, message: err.message || 'Failed to update quotation draft', severity: 'error' });
    },
  });

  if (isLoading) {
    return (
      <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
        <Skeleton variant="text" width={240} height={40} />
        <Skeleton variant="rectangular" height={400} sx={{ mt: 2, borderRadius: 2 }} />
      </Box>
    );
  }

  if (isError || !quotation) {
    return (
      <ErrorState message={error instanceof Error ? error.message : 'The requested quotation could not be loaded.'} onRetry={refetch} />
    );
  }

  // Non-draft check
  if (quotation.status !== 'DRAFT') {
    return (
      <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          Quotation <strong>{quotation.quotationNumber}</strong> is currently in status <strong>{formatQuotationStatusLabel(quotation.status)}</strong> and can no longer be edited. Only Draft quotations are editable.
        </Alert>
        <Button variant="contained" onClick={() => navigate(`/quotations/${quotation.id}`)}>
          View Quotation Details
        </Button>
      </Box>
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
    <Box sx={{ maxWidth: 1200, mx: 'auto', width: '100%' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          Edit Draft Quotation — {quotation.quotationNumber}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Update customer details, line items or charges. A version snapshot will be saved automatically upon submission.
        </Typography>
      </Box>

      <QuotationForm
        initialValues={initialValues}
        editingQuotation={quotation}
        isSubmitting={updateMutation.isPending}
        onCancel={() => navigate(`/quotations/${quotation.id}`)}
        onSubmit={(values) => updateMutation.mutate(values)}
      />

      <Snackbar
        open={feedback.open}
        autoHideDuration={4000}
        onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
      >
        <Alert severity={feedback.severity} onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}>
          {feedback.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
