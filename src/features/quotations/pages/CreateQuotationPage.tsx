import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { getQuotationSettingsRequest } from '../../settings/api/quotation-settings.api';
import { createQuotationRequest } from '../api/quotations.api';
import { QuotationForm } from '../components/QuotationForm';
import { quotationsQueryKeys } from '../quotations.query-keys';
import type { QuotationFormSubmitValues } from '../quotations.schema';

export function CreateQuotationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [feedback, setFeedback] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

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
      setFeedback({ open: true, message: `Quotation ${created.quotationNumber} created successfully!`, severity: 'success' });
      queryClient.invalidateQueries({ queryKey: quotationsQueryKeys.all });
      navigate(`/quotations/${created.id}`);
    },
    onError: (err: Error) => {
      setFeedback({ open: true, message: err.message || 'Failed to create quotation', severity: 'error' });
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
    <Box sx={{ maxWidth: 1200, mx: 'auto', width: '100%' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          Create New Quotation
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Fill in customer selection, line items, and terms. Quotation number will be generated automatically.
        </Typography>
      </Box>

      <QuotationForm
        initialValues={initialValues}
        isSubmitting={createMutation.isPending}
        onCancel={() => navigate('/quotations')}
        onSubmit={(values) => createMutation.mutate(values)}
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
