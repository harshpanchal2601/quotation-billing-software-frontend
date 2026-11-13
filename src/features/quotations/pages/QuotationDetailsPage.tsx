import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { lazy, Suspense, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { ErrorState } from '@shared/components/common/ErrorState';
import { AppButton } from '@shared/ui/actions';
import { AppSnackbar } from '@shared/ui/feedback';
import { AmountSummary, DetailFields, DetailHeader, DetailSection, PageContainer } from '@shared/ui/layout';
import { TenantFieldsPanel } from '@features/automation';
import { RecordTable } from '@shared/ui/tables';
import { paths } from '@shared/routing/paths';
import { getSafeListReturnPath } from '@shared/routing/returnNavigation';
import { toApiError } from '@shared/api/apiClient';
import { PERMISSIONS, useHasPermission } from '@features/auth';
import {
  createQuotationRevisionRequest,
  deleteQuotationRequest,
  downloadQuotationPdfBlobRequest,
  generateQuotationPdfRequest,
  getQuotationPdfPreviewBlobRequest,
  getQuotationRequest,
  updateQuotationStatusRequest,
} from '../api/quotations.api';
import { QuotationAttachmentsSection } from '../attachments/components/QuotationAttachmentsSection';
import { QuotationDeleteDialog } from '../components/QuotationDeleteDialog';
import { QuotationDocumentsSection } from '../documents/components/QuotationDocumentsSection';
import { QuotationPdfPreviewDialog } from '../documents/components/QuotationPdfPreviewDialog';
import { QuotationStatusChip } from '../components/QuotationStatusChip';
import { QuotationStatusDialog } from '../components/QuotationStatusDialog';
import { quotationsQueryKeys } from '../model/quotations.query-keys';
import type { QuotationStatus } from '../model/quotations.types';
import {
  formatCurrency,
  formatDiscountTypeLabel,
  formatQuotationStatusLabel,
  formatTaxModeLabel,
} from '../model/quotations.utils';

const QuotationInvoiceConversion = lazy(() => import('@features/invoices').then((module) => ({ default: module.QuotationInvoiceConversion })));

export function QuotationDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const quotationId = Number(id);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const returnPath = getSafeListReturnPath(location, paths.quotations);
  const canEditQuotations = useHasPermission(PERMISSIONS.QUOTATIONS_EDIT);
  const canUpdateQuotationStatus = useHasPermission(PERMISSIONS.QUOTATIONS_STATUS);
  const canDeleteQuotations = useHasPermission(PERMISSIONS.QUOTATIONS_DELETE);
  const canManageDocuments = useHasPermission(PERMISSIONS.QUOTATIONS_DOCUMENTS);
  const canEmailQuotations = useHasPermission(PERMISSIONS.QUOTATIONS_EMAIL);
  const canManageAttachments = useHasPermission(PERMISSIONS.QUOTATIONS_ATTACHMENTS);
  const canCreateInvoices = useHasPermission(PERMISSIONS.INVOICES_CREATE);
  const canCreateOrders = useHasPermission(PERMISSIONS.SALES_ORDERS_MANAGE);
  const [invoiceConversionOpen, setInvoiceConversionOpen] = useState(false);

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [activeDocumentId, setActiveDocumentId] = useState<number | null>(null);

  const [feedback, setFeedback] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const { data: quotation, isLoading, isError, error, refetch } = useQuery({
    queryKey: quotationsQueryKeys.detail(quotationId),
    queryFn: () => getQuotationRequest(quotationId),
    enabled: Boolean(quotationId && quotationId > 0),
  });

  const statusMutation = useMutation({
    mutationFn: ({ status, comment }: { status: QuotationStatus; comment?: string }) =>
      updateQuotationStatusRequest(quotationId, { status, comment }),
    onSuccess: (updated) => {
      setFeedback({ open: true, message: `Status updated to ${formatQuotationStatusLabel(updated.status)}`, severity: 'success' });
      queryClient.invalidateQueries({ queryKey: quotationsQueryKeys.all });
      setStatusDialogOpen(false);
    },
    onError: (error) => {
      const apiError = toApiError(error);
      if (apiError.approvalRequested) setStatusDialogOpen(false);
      if (!apiError.cancelled) setFeedback({ open: true, message: apiError.message, severity: apiError.approvalRequested ? 'info' : 'error' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteQuotationRequest(quotationId),
    onSuccess: () => {
      setFeedback({ open: true, message: 'Draft quotation deleted successfully', severity: 'success' });
      queryClient.invalidateQueries({ queryKey: quotationsQueryKeys.all });
      setDeleteDialogOpen(false);
      navigate(returnPath);
    },
    onError: (error) => {
      const apiError = toApiError(error);
      if (!apiError.cancelled) setFeedback({ open: true, message: apiError.message, severity: 'error' });
    },
  });

  const createRevisionMutation = useMutation({
    mutationFn: () => createQuotationRevisionRequest(quotationId),
    onSuccess: (created) => {
      setFeedback({
        open: true,
        message: `Revision #${created.revisionNumber} created as a draft`,
        severity: 'success',
      });
      queryClient.invalidateQueries({ queryKey: quotationsQueryKeys.all });
      navigate(`/quotations/${created.id}/edit`, { state: { from: returnPath } });
    },
    onError: (error) => {
      const apiError = toApiError(error);
      if (!apiError.cancelled) setFeedback({ open: true, message: apiError.message, severity: 'error' });
    },
  });

  const handlePreviewPdf = async () => {
    if (pdfLoading) return;
    setPdfPreviewOpen(true);
    setPdfLoading(true);
    setPdfError(null);

    try {
      let docId = activeDocumentId;
      if (!docId) {
        const genResult = await generateQuotationPdfRequest(quotationId);
        docId = genResult.document.id;
        setActiveDocumentId(docId);
      }

      const blob = await getQuotationPdfPreviewBlobRequest(quotationId, docId);
      setPdfBlob(blob);
    } catch (err: unknown) {
      const apiError = toApiError(err);
      if (!apiError.cancelled) setPdfError(apiError.message);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (pdfDownloading) return;
    try {
      setPdfDownloading(true);
      let docId = activeDocumentId;
      if (!docId) {
        const genResult = await generateQuotationPdfRequest(quotationId);
        docId = genResult.document.id;
        setActiveDocumentId(docId);
      }

      const { blob, filename } = await downloadQuotationPdfBlobRequest(quotationId, docId);

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setFeedback({ open: true, message: `PDF downloaded: ${filename}`, severity: 'success' });
    } catch (err: unknown) {
      const apiError = toApiError(err);
      if (!apiError.cancelled) setFeedback({ open: true, message: apiError.message, severity: 'error' });
    } finally {
      setPdfDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <PageContainer maxWidth={1200} sx={{ p: { xs: 0, sm: 3 }, mx: 'auto' }}>
        <Skeleton variant="text" width={300} height={40} />
        <Skeleton variant="rectangular" height={500} sx={{ mt: 2, borderRadius: 2 }} />
      </PageContainer>
    );
  }

  if (isError || !quotation) {
    return (
      <ErrorState message={toApiError(error).message} onRetry={refetch} />
    );
  }

  const canEdit = canEditQuotations && quotation.canEdit;
  const canCreateRevision = canEditQuotations && quotation.canCreateRevision;
  const canChangeStatus = canUpdateQuotationStatus && quotation.isLatestRevision;
  const canDelete = canDeleteQuotations && quotation.canEdit;

  return (
    <PageContainer maxWidth={1200} sx={{ mx: 'auto' }}>
      {!quotation.isLatestRevision && quotation.latestRevision ? (
        <Alert
          severity="info"
          action={
            <AppButton color="inherit" size="small" onClick={() => navigate(`/quotations/${quotation.latestRevision?.id}`, { state: { from: returnPath } })}>
              View Latest
            </AppButton>
          }
          sx={{ mb: 2 }}
        >
          You are viewing historical Revision #{quotation.revisionNumber}. Latest is Revision #{quotation.latestRevision.revisionNumber}.
        </Alert>
      ) : null}

      <DetailHeader title={quotation.quotationNumber} status={<QuotationStatusChip status={quotation.status} size="medium" />}
        description={`Revision #${quotation.revisionNumber} • Created ${new Date(quotation.createdAt).toLocaleString()} by ${quotation.createdBy?.name || 'Admin'}`}
        backAction={<AppButton size="small" startIcon={<ArrowBackIcon />} onClick={() => navigate(returnPath)} color="inherit">Back to Quotations</AppButton>}
        actionLabel="Quotation actions" actions={<>
          {canManageDocuments ? (
            <>
              <AppButton
                variant="contained"
                color="primary"
                startIcon={<PictureAsPdfOutlinedIcon />}
                onClick={handlePreviewPdf}
                isLoading={pdfLoading}
                loadingPosition="start"
              >
                {pdfLoading ? 'Generating...' : 'Preview PDF'}
              </AppButton>

              <AppButton
                variant="outlined"
                color="primary"
                startIcon={<DownloadOutlinedIcon />}
                onClick={handleDownloadPdf}
                isLoading={pdfDownloading}
                loadingPosition="start"
              >
                {pdfDownloading ? 'Downloading...' : 'Download PDF'}
              </AppButton>
            </>
          ) : null}

          {canEdit ? (
            <AppButton
              variant="outlined"
              color="primary"
              startIcon={<EditOutlinedIcon />}
              onClick={() => navigate(`/quotations/${quotation.id}/edit`, { state: { from: returnPath } })}
            >
              Edit Draft
            </AppButton>
          ) : null}

          {quotation.status === 'ACCEPTED' && canCreateInvoices ? <AppButton variant="contained" onClick={() => setInvoiceConversionOpen(true)}>Create Invoice</AppButton> : null}
          {quotation.status === 'ACCEPTED' && canCreateOrders ? <AppButton onClick={() => navigate(`/sales-orders?sourceRevisionId=${quotation.id}`)}>Create Sales Order</AppButton> : null}
          {invoiceConversionOpen ? <Suspense fallback={<Typography>Loading conversion…</Typography>}><QuotationInvoiceConversion source={quotation} onClose={() => setInvoiceConversionOpen(false)} /></Suspense> : null}

          {canCreateRevision ? (
            <AppButton
              variant="contained"
              color="secondary"
              startIcon={<ContentCopyOutlinedIcon />}
              onClick={() => createRevisionMutation.mutate()}
              isLoading={createRevisionMutation.isPending}
              loadingPosition="start"
            >
              {createRevisionMutation.isPending ? 'Creating...' : 'Create Revision'}
            </AppButton>
          ) : null}

          {canUpdateQuotationStatus ? <AppButton
            variant="outlined"
            color="inherit"
            startIcon={<SwapHorizOutlinedIcon />}
            onClick={() => setStatusDialogOpen(true)}
            disabled={statusMutation.isPending || !canChangeStatus}
          >
            Change Status
          </AppButton> : null}

          {canDelete ? (
            <AppButton
              variant="outlined"
              color="error"
              startIcon={<DeleteOutlineOutlinedIcon />}
              onClick={() => setDeleteDialogOpen(true)}
              disabled={deleteMutation.isPending}
            >
              Delete
            </AppButton>
          ) : null}
        </>} />

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <DetailSection title="Customer details" description="Customer information saved with this quotation.">
            <Typography variant="h6" fontWeight={700}>{quotation.companyNameSnapshot}</Typography>
            <DetailFields fields={[
              ...(quotation.companyGstinSnapshot ? [{ label: 'GSTIN', value: quotation.companyGstinSnapshot }] : []),
              ...(quotation.companyPanSnapshot ? [{ label: 'PAN', value: quotation.companyPanSnapshot }] : []),
              ...(quotation.contactNameSnapshot ? [{ label: 'Contact', value: [quotation.contactNameSnapshot, quotation.contactPhoneSnapshot].filter(Boolean).join(' · ') }] : []),
              ...(quotation.contactEmailSnapshot ? [{ label: 'Email', value: quotation.contactEmailSnapshot }] : []),
            ]} />
          </DetailSection>
        </Grid>
        <Grid item xs={12} md={6}>
          <DetailSection title="Quotation details"><DetailFields fields={[
            { label: 'Quotation date', value: new Date(quotation.quotationDate).toLocaleDateString() },
            { label: 'Valid until', value: quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString() : 'Not specified' },
            { label: 'Tax treatment', value: formatTaxModeLabel(quotation.taxMode) }, { label: 'Currency', value: quotation.currency },
          ]} /></DetailSection>
        </Grid>
        {quotation.billingAddressSnapshot || quotation.shippingAddressSnapshot ? <Grid item xs={12}>
          <DetailSection title="Addresses"><DetailFields fields={([
            ['Billing address', quotation.billingAddressSnapshot], ['Shipping address', quotation.shippingAddressSnapshot],
          ] as const).flatMap(([label, address]) => address ? [{ label, value: [address.addressLine1, address.addressLine2, [address.city, address.state, address.postalCode].filter(Boolean).join(', '), address.country].filter(Boolean).join('\n') }] : [])} /></DetailSection>
        </Grid> : null}
        <Grid item xs={12}>
          <DetailSection title={`Quotation line items (${quotation.items.length})`}>
            <RecordTable rows={quotation.items} label="Quotation line items" rowKey={(item) => item.id} columns={[
              { key: 'line', label: 'Line', sortValue: (item) => item.lineNumber, render: (item) => item.lineNumber },
              { key: 'item', label: 'Item description', sortValue: (item) => item.itemNameSnapshot, render: (item) => <Box><Typography variant="body2" fontWeight={600}>{item.itemNameSnapshot}</Typography>{item.itemCodeSnapshot ? <Typography variant="caption" color="text.secondary" display="block">Code: {item.itemCodeSnapshot}</Typography> : null}{item.descriptionSnapshot ? <Typography variant="caption" color="text.secondary" display="block" sx={{ whiteSpace: 'pre-wrap' }}>{item.descriptionSnapshot}</Typography> : null}</Box> },
              { key: 'quantity', label: 'Quantity', align: 'right', sortValue: (item) => item.quantity, render: (item) => `${item.quantity} ${item.measurementUnitSnapshot}` },
              { key: 'rate', label: 'Unit rate', align: 'right', sortValue: (item) => item.unitRate, render: (item) => formatCurrency(item.unitRate, quotation.currency) },
              { key: 'base', label: 'Base amount', align: 'right', sortValue: (item) => item.baseAmount, render: (item) => formatCurrency(item.baseAmount, quotation.currency) },
              { key: 'discount', label: 'Discount', align: 'right', sortValue: (item) => item.discountAmount, render: (item) => formatCurrency(item.discountAmount, quotation.currency) },
              { key: 'taxable', label: 'Taxable', align: 'right', sortValue: (item) => item.taxableAmount, render: (item) => formatCurrency(item.taxableAmount, quotation.currency) },
              { key: 'gst', label: 'GST rate', align: 'right', sortValue: (item) => item.gstRate, render: (item) => `${item.gstRate}%` },
              { key: 'total', label: 'Line total', align: 'right', sortValue: (item) => item.lineTotal, render: (item) => <Typography variant="body2" fontWeight={700}>{formatCurrency(item.lineTotal, quotation.currency)}</Typography> },
            ]} />
          </DetailSection>
        </Grid>
        <Grid item xs={12} md={6} sx={{ ml: 'auto' }}>
          <DetailSection title="Financial totals"><AmountSummary rows={[
            { label: 'Subtotal', value: formatCurrency(quotation.subtotal, quotation.currency) },
            ...(/[1-9]/.test(quotation.itemDiscountAmount) ? [{ label: 'Line item discounts', value: `− ${formatCurrency(quotation.itemDiscountAmount, quotation.currency)}` }] : []),
            ...(/[1-9]/.test(quotation.quotationDiscountAmount) ? [{ label: `Quotation discount (${formatDiscountTypeLabel(quotation.quotationDiscountType)})`, value: `− ${formatCurrency(quotation.quotationDiscountAmount, quotation.currency)}` }] : []),
            { label: 'Taxable amount', value: formatCurrency(quotation.taxableAmount, quotation.currency) },
            ...(quotation.taxMode === 'CGST_SGST' ? [{ label: 'CGST', value: formatCurrency(quotation.cgstAmount, quotation.currency) }, { label: 'SGST', value: formatCurrency(quotation.sgstAmount, quotation.currency) }] : quotation.taxMode === 'IGST' ? [{ label: 'IGST', value: formatCurrency(quotation.igstAmount, quotation.currency) }] : []),
            ...(/[1-9]/.test(quotation.freightAmount) ? [{ label: 'Freight amount', value: formatCurrency(quotation.freightAmount, quotation.currency) }] : []),
            ...(/[1-9]/.test(quotation.otherCharges) ? [{ label: 'Other charges', value: formatCurrency(quotation.otherCharges, quotation.currency) }] : []),
            ...(/[1-9]/.test(quotation.roundOffAmount) ? [{ label: 'Round-off adjustment', value: formatCurrency(quotation.roundOffAmount, quotation.currency) }] : []),
            { label: 'Grand total', value: formatCurrency(quotation.grandTotal, quotation.currency), emphasis: true },
          ]} />{quotation.amountInWords ? <Typography variant="caption" color="text.secondary" fontStyle="italic">In words: {quotation.amountInWords}</Typography> : null}</DetailSection>
        </Grid>
        {quotation.remarks || quotation.internalNotes || quotation.termsAndConditions ? <Grid item xs={12}>
          <DetailSection title="Notes & terms"><DetailFields columns={1} fields={[
            ...(quotation.remarks ? [{ label: 'Customer remarks', value: quotation.remarks }] : []),
            ...(quotation.termsAndConditions ? [{ label: 'Terms & conditions', value: quotation.termsAndConditions }] : []),
          ]} />{quotation.internalNotes ? <Alert severity="warning"><DetailFields columns={1} fields={[{ label: 'Internal notes (team only)', value: quotation.internalNotes }]} /></Alert> : null}</DetailSection>
        </Grid> : null}
        {quotation.statusHistory?.length ? <Grid item xs={12}>
          <DetailSection title="Status history"><RecordTable rows={quotation.statusHistory} label="Quotation status history" rowKey={(history) => history.id} columns={[
            { key: 'from', label: 'From', sortValue: (history) => history.fromStatus, noWrap: true, render: (history) => history.fromStatus ? formatQuotationStatusLabel(history.fromStatus) : 'Created' },
            { key: 'to', label: 'To', sortValue: (history) => history.toStatus, noWrap: true, render: (history) => formatQuotationStatusLabel(history.toStatus) },
            { key: 'note', label: 'Note', sortValue: (history) => history.comment, render: (history) => history.comment || 'Not specified' },
            { key: 'by', label: 'Changed by', sortValue: (history) => history.changedBy?.name || history.portalActorName, render: (history) => history.changedBy?.name || history.portalActorName || 'Admin' },
            { key: 'date', label: 'Changed at', noWrap: true, sortValue: (history) => new Date(history.changedAt).getTime(), render: (history) => new Date(history.changedAt).toLocaleString() },
          ]} /></DetailSection>
        </Grid> : null}
      </Grid>

      <TenantFieldsPanel key={quotation.id} entity="QUOTATION" entityId={quotation.id} editable={canEdit} />

      {/* Generated Documents History Section */}
      {canManageDocuments || canEmailQuotations ? (
        <QuotationDocumentsSection
          quotation={quotation}
          canManageDocuments={canManageDocuments}
          canEmail={canEmailQuotations}
          onFeedback={(msg, sev) =>
            setFeedback({ open: true, message: msg, severity: sev || 'success' })
          }
        />
      ) : null}

      {/* Supporting Attachments Section */}
      {canManageAttachments ? (
        <QuotationAttachmentsSection
          quotationId={quotationId}
          onFeedback={(msg, sev) =>
            setFeedback({ open: true, message: msg, severity: sev || 'success' })
          }
        />
      ) : null}

      {/* Modals */}
      {canUpdateQuotationStatus && statusDialogOpen ? (
        <QuotationStatusDialog
          open={statusDialogOpen}
          quotationNumber={quotation.quotationNumber}
          currentStatus={quotation.status}
          isSubmitting={statusMutation.isPending}
          onClose={() => setStatusDialogOpen(false)}
          onConfirm={(targetStatus, comment) =>
            statusMutation.mutate({ status: targetStatus, comment })
          }
        />
      ) : null}

      {canDeleteQuotations && deleteDialogOpen ? (
        <QuotationDeleteDialog
          open={deleteDialogOpen}
          quotationNumber={quotation.quotationNumber}
          customerName={quotation.companyNameSnapshot}
          grandTotal={quotation.grandTotal}
          currency={quotation.currency}
          isSubmitting={deleteMutation.isPending}
          onClose={() => setDeleteDialogOpen(false)}
          onConfirm={() => deleteMutation.mutate()}
        />
      ) : null}

      {/* PDF Preview Dialog */}
      {canManageDocuments ? <QuotationPdfPreviewDialog
        open={pdfPreviewOpen}
        quotationNumber={quotation.quotationNumber}
        pdfBlob={pdfBlob}
        isLoading={pdfLoading}
        error={pdfError}
        onClose={() => setPdfPreviewOpen(false)}
        onDownload={handleDownloadPdf}
      /> : null}

      {/* Feedback Snackbar */}
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

