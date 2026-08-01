import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { ErrorState } from '@shared/components/common/ErrorState';
import { paths } from '@app/router/routeConfig';
import { getSafeListReturnPath } from '@app/router/returnNavigation';
import { toApiError } from '@shared/api/apiClient';
import {
  createQuotationRevisionRequest,
  deleteQuotationRequest,
  downloadQuotationPdfBlobRequest,
  generateQuotationPdfRequest,
  getQuotationPdfPreviewBlobRequest,
  getQuotationRequest,
  updateQuotationStatusRequest,
} from '../api/quotations.api';
import { QuotationAttachmentsSection } from '../components/QuotationAttachmentsSection';
import { QuotationDeleteDialog } from '../components/QuotationDeleteDialog';
import { QuotationDocumentsSection } from '../components/QuotationDocumentsSection';
import { QuotationPdfPreviewDialog } from '../components/QuotationPdfPreviewDialog';
import { QuotationStatusChip } from '../components/QuotationStatusChip';
import { QuotationStatusDialog } from '../components/QuotationStatusDialog';
import { quotationsQueryKeys } from '../quotations.query-keys';
import type { QuotationStatus } from '../quotations.types';
import {
  formatCurrency,
  formatDiscountTypeLabel,
  formatQuotationStatusLabel,
  formatTaxModeLabel,
} from '../quotations.utils';

export function QuotationDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const quotationId = Number(id);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down('md'));
  const returnPath = getSafeListReturnPath(location, paths.quotations);

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [activeDocumentId, setActiveDocumentId] = useState<number | null>(null);

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
      if (!apiError.cancelled) setFeedback({ open: true, message: apiError.message, severity: 'error' });
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
      <Box sx={{ p: { xs: 0, sm: 3 }, maxWidth: 1200, mx: 'auto' }}>
        <Skeleton variant="text" width={300} height={40} />
        <Skeleton variant="rectangular" height={500} sx={{ mt: 2, borderRadius: 2 }} />
      </Box>
    );
  }

  if (isError || !quotation) {
    return (
      <ErrorState message={toApiError(error).message} onRetry={refetch} />
    );
  }

  const canEdit = quotation.canEdit;
  const canCreateRevision = quotation.canCreateRevision;
  const canChangeStatus = quotation.isLatestRevision;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', width: '100%' }}>
      {!quotation.isLatestRevision && quotation.latestRevision ? (
        <Alert
          severity="info"
          action={
            <Button color="inherit" size="small" onClick={() => navigate(`/quotations/${quotation.latestRevision?.id}`, { state: { from: returnPath } })}>
              View Latest
            </Button>
          }
          sx={{ mb: 2 }}
        >
          You are viewing historical Revision #{quotation.revisionNumber}. Latest is Revision #{quotation.latestRevision.revisionNumber}.
        </Alert>
      ) : null}

      {/* Header Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'stretch', md: 'center' }, mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 2 }, minWidth: 0 }}>
          <Button
            size="small"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(returnPath)}
            color="inherit"
          >
            Back to Quotations
          </Button>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Typography component="h1" variant="h1" sx={{ wordBreak: 'break-word' }}>
                {quotation.quotationNumber}
              </Typography>
              <QuotationStatusChip status={quotation.status} size="medium" />
            </Box>
            <Typography variant="caption" color="text.secondary">
              Revision #{quotation.revisionNumber} • Created {new Date(quotation.createdAt).toLocaleString()} by {quotation.createdBy?.name || 'Admin'}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', width: { xs: '100%', md: 'auto' }, '& .MuiButton-root': { flex: { xs: '1 1 150px', md: '0 0 auto' } } }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PictureAsPdfOutlinedIcon />}
            onClick={handlePreviewPdf}
            loading={pdfLoading}
            loadingPosition="start"
          >
            {pdfLoading ? 'Generating...' : 'Preview PDF'}
          </Button>

          <Button
            variant="outlined"
            color="primary"
            startIcon={<DownloadOutlinedIcon />}
            onClick={handleDownloadPdf}
            loading={pdfDownloading}
            loadingPosition="start"
          >
            {pdfDownloading ? 'Downloading...' : 'Download PDF'}
          </Button>

          {canEdit ? (
            <Button
              variant="outlined"
              color="primary"
              startIcon={<EditOutlinedIcon />}
              onClick={() => navigate(`/quotations/${quotation.id}/edit`, { state: { from: returnPath } })}
            >
              Edit Draft
            </Button>
          ) : null}

          {canCreateRevision ? (
            <Button
              variant="contained"
              color="secondary"
              startIcon={<ContentCopyOutlinedIcon />}
              onClick={() => createRevisionMutation.mutate()}
              loading={createRevisionMutation.isPending}
              loadingPosition="start"
            >
              {createRevisionMutation.isPending ? 'Creating...' : 'Create Revision'}
            </Button>
          ) : null}

          <Button
            variant="outlined"
            color="inherit"
            startIcon={<SwapHorizOutlinedIcon />}
            onClick={() => setStatusDialogOpen(true)}
            disabled={statusMutation.isPending || !canChangeStatus}
          >
            Change Status
          </Button>

          {canEdit ? (
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteOutlineOutlinedIcon />}
              onClick={() => setDeleteDialogOpen(true)}
              disabled={deleteMutation.isPending}
            >
              Delete
            </Button>
          ) : null}
        </Box>
      </Box>

      {/* Main Grid */}
      <Grid container spacing={3}>
        {/* Customer & Address Snapshots */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} color="primary.main" gutterBottom>
                Customer Details (Saved Snapshot)
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                {quotation.companyNameSnapshot}
              </Typography>

              <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {quotation.companyGstinSnapshot ? (
                  <Typography variant="body2" color="text.secondary">
                    <strong>GSTIN:</strong> {quotation.companyGstinSnapshot}
                  </Typography>
                ) : null}
                {quotation.companyPanSnapshot ? (
                  <Typography variant="body2" color="text.secondary">
                    <strong>PAN:</strong> {quotation.companyPanSnapshot}
                  </Typography>
                ) : null}
                {quotation.contactNameSnapshot ? (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Contact:</strong> {quotation.contactNameSnapshot}{' '}
                    {quotation.contactPhoneSnapshot ? `(${quotation.contactPhoneSnapshot})` : ''}
                  </Typography>
                ) : null}
                {quotation.contactEmailSnapshot ? (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Email:</strong> {quotation.contactEmailSnapshot}
                  </Typography>
                ) : null}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Quotation Dates & Configuration */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} color="primary.main" gutterBottom>
                Quotation Configuration
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5, mt: 1 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Quotation Date
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {new Date(quotation.quotationDate).toLocaleDateString()}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Valid Until
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString() : 'N/A'}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Tax Mode
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {formatTaxModeLabel(quotation.taxMode)}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Currency
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {quotation.currency}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Addresses Snapshots */}
        {quotation.billingAddressSnapshot || quotation.shippingAddressSnapshot ? (
          <Grid item xs={12}>
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent>
                <Grid container spacing={2}>
                  {quotation.billingAddressSnapshot ? (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                        Billing Address (Snapshot)
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {quotation.billingAddressSnapshot.addressLine1}
                        {quotation.billingAddressSnapshot.addressLine2 ? `, ${quotation.billingAddressSnapshot.addressLine2}` : ''}
                        <br />
                        {quotation.billingAddressSnapshot.city}, {quotation.billingAddressSnapshot.state} — {quotation.billingAddressSnapshot.postalCode}
                        <br />
                        {quotation.billingAddressSnapshot.country}
                      </Typography>
                    </Grid>
                  ) : null}

                  {quotation.shippingAddressSnapshot ? (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                        Shipping Address (Snapshot)
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {quotation.shippingAddressSnapshot.addressLine1}
                        {quotation.shippingAddressSnapshot.addressLine2 ? `, ${quotation.shippingAddressSnapshot.addressLine2}` : ''}
                        <br />
                        {quotation.shippingAddressSnapshot.city}, {quotation.shippingAddressSnapshot.state} — {quotation.shippingAddressSnapshot.postalCode}
                        <br />
                        {quotation.shippingAddressSnapshot.country}
                      </Typography>
                    </Grid>
                  ) : null}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        ) : null}

        {/* Line Items Table */}
        <Grid item xs={12}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
            Quotation Line Items ({quotation.items.length})
          </Typography>
          {isCompact ? (
            <Stack spacing={1.5} aria-label="Quotation line item cards">
              {quotation.items.map((item) => (
                <Card key={item.id} variant="outlined">
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="caption" color="text.secondary">
                          Line #{item.lineNumber}
                        </Typography>
                        <Typography variant="subtitle2" fontWeight={700} sx={{ wordBreak: 'break-word' }}>
                          {item.itemNameSnapshot}
                        </Typography>
                        {item.itemCodeSnapshot ? (
                          <Typography variant="caption" color="text.secondary" display="block">
                            Code: {item.itemCodeSnapshot}
                          </Typography>
                        ) : null}
                      </Box>
                      <Typography variant="subtitle2" fontWeight={700} color="primary.main" sx={{ textAlign: 'right', wordBreak: 'break-word' }}>
                        {formatCurrency(item.lineTotal, quotation.currency)}
                      </Typography>
                    </Stack>
                    {item.descriptionSnapshot ? (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {item.descriptionSnapshot}
                      </Typography>
                    ) : null}
                    <Divider sx={{ my: 1.5 }} />
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
                      <DetailMetric label="Quantity" value={`${item.quantity} ${item.measurementUnitSnapshot}`} />
                      <DetailMetric label="Unit Rate" value={formatCurrency(item.unitRate, quotation.currency)} />
                      <DetailMetric label="Base Amount" value={formatCurrency(item.baseAmount, quotation.currency)} />
                      <DetailMetric label="Discount" value={formatCurrency(item.discountAmount, quotation.currency)} />
                      <DetailMetric label="Taxable" value={formatCurrency(item.taxableAmount, quotation.currency)} />
                      <DetailMetric label="GST Rate" value={`${item.gstRate}%`} />
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small" sx={{ minWidth: 980 }}>
                <TableHead sx={{ bgcolor: 'grey.50' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Item Description</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Qty</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Unit Rate</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Base Amount</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Discount</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Taxable</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>GST Rate</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Line Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {quotation.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell sx={{ fontWeight: 600 }}>{item.lineNumber}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {item.itemNameSnapshot}
                        </Typography>
                        {item.itemCodeSnapshot ? (
                          <Typography variant="caption" color="text.secondary" display="block">
                            Code: {item.itemCodeSnapshot}
                          </Typography>
                        ) : null}
                        {item.descriptionSnapshot ? (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {item.descriptionSnapshot}
                          </Typography>
                        ) : null}
                      </TableCell>
                      <TableCell align="right">{item.quantity} {item.measurementUnitSnapshot}</TableCell>
                      <TableCell align="right">{formatCurrency(item.unitRate, quotation.currency)}</TableCell>
                      <TableCell align="right">{formatCurrency(item.baseAmount, quotation.currency)}</TableCell>
                      <TableCell align="right">{formatCurrency(item.discountAmount, quotation.currency)}</TableCell>
                      <TableCell align="right">{formatCurrency(item.taxableAmount, quotation.currency)}</TableCell>
                      <TableCell align="right">{item.gstRate}%</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {formatCurrency(item.lineTotal, quotation.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Grid>

        {/* Totals Breakdown */}
        <Grid item xs={12} md={6} sx={{ ml: 'auto' }}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                Financial Totals Breakdown
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                  <Typography variant="body2">{formatCurrency(quotation.subtotal, quotation.currency)}</Typography>
                </Box>
                {Number(quotation.itemDiscountAmount) > 0 ? (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Line Item Discounts</Typography>
                    <Typography variant="body2" color="success.main">- {formatCurrency(quotation.itemDiscountAmount, quotation.currency)}</Typography>
                  </Box>
                ) : null}
                {Number(quotation.quotationDiscountAmount) > 0 ? (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Quotation Discount ({formatDiscountTypeLabel(quotation.quotationDiscountType)})</Typography>
                    <Typography variant="body2" color="success.main">- {formatCurrency(quotation.quotationDiscountAmount, quotation.currency)}</Typography>
                  </Box>
                ) : null}
                <Divider />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" fontWeight={600}>Taxable Amount</Typography>
                  <Typography variant="body2" fontWeight={600}>{formatCurrency(quotation.taxableAmount, quotation.currency)}</Typography>
                </Box>
                {quotation.taxMode === 'CGST_SGST' ? (
                  <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">CGST</Typography>
                      <Typography variant="body2">{formatCurrency(quotation.cgstAmount, quotation.currency)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">SGST</Typography>
                      <Typography variant="body2">{formatCurrency(quotation.sgstAmount, quotation.currency)}</Typography>
                    </Box>
                  </>
                ) : quotation.taxMode === 'IGST' ? (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">IGST</Typography>
                    <Typography variant="body2">{formatCurrency(quotation.igstAmount, quotation.currency)}</Typography>
                  </Box>
                ) : null}
                {Number(quotation.freightAmount) > 0 ? (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Freight Amount</Typography>
                    <Typography variant="body2">{formatCurrency(quotation.freightAmount, quotation.currency)}</Typography>
                  </Box>
                ) : null}
                {Number(quotation.roundOffAmount) !== 0 ? (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Round-off Adjustment</Typography>
                    <Typography variant="body2">{formatCurrency(quotation.roundOffAmount, quotation.currency)}</Typography>
                  </Box>
                ) : null}
                <Divider />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1 }}>
                  <Typography variant="h6" fontWeight={700} color="primary.main">Grand Total</Typography>
                  <Typography variant="h6" fontWeight={700} color="primary.main">{formatCurrency(quotation.grandTotal, quotation.currency)}</Typography>
                </Box>
                {quotation.amountInWords ? (
                  <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', mt: 0.5 }}>
                    <strong>In Words:</strong> {quotation.amountInWords}
                  </Typography>
                ) : null}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Remarks & Internal Notes */}
        {quotation.remarks || quotation.internalNotes || quotation.termsAndConditions ? (
          <Grid item xs={12}>
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {quotation.remarks ? (
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                      Customer Remarks
                    </Typography>
                    <Typography variant="body2" color="text.secondary" whiteSpace="pre-line">
                      {quotation.remarks}
                    </Typography>
                  </Box>
                ) : null}

                {quotation.termsAndConditions ? (
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                      Terms & Conditions
                    </Typography>
                    <Typography variant="body2" color="text.secondary" whiteSpace="pre-line">
                      {quotation.termsAndConditions}
                    </Typography>
                  </Box>
                ) : null}

                {quotation.internalNotes ? (
                  <Box sx={{ p: 1.5, bgcolor: 'warning.50', borderRadius: 1, border: '1px solid', borderColor: 'warning.200' }}>
                    <Typography variant="subtitle2" fontWeight={700} color="warning.900" gutterBottom>
                      Internal Notes (Confidential)
                    </Typography>
                    <Typography variant="body2" color="warning.900" whiteSpace="pre-line">
                      {quotation.internalNotes}
                    </Typography>
                  </Box>
                ) : null}
              </CardContent>
            </Card>
          </Grid>
        ) : null}

        {/* Status History Timeline */}
        {quotation.statusHistory && quotation.statusHistory.length > 0 ? (
          <Grid item xs={12}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
              Status Transition History
            </Typography>
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent>
                <Stack spacing={2} divider={<Divider />}>
                  {quotation.statusHistory.map((hist) => (
                    <Box key={hist.id} sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'flex-start' } }}>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {hist.fromStatus ? `${formatQuotationStatusLabel(hist.fromStatus)} → ` : ''}
                          {formatQuotationStatusLabel(hist.toStatus)}
                        </Typography>
                        {hist.comment ? (
                          <Typography variant="caption" color="text.secondary" display="block">
                            Note: {hist.comment}
                          </Typography>
                        ) : null}
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(hist.changedAt).toLocaleString()} by {hist.changedBy?.name || 'Admin'}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ) : null}
      </Grid>

      {/* Generated Documents History Section */}
      <QuotationDocumentsSection
        quotation={quotation}
        onFeedback={(msg, sev) =>
          setFeedback({ open: true, message: msg, severity: sev || 'success' })
        }
      />

      {/* Supporting Attachments Section */}
      <QuotationAttachmentsSection
        quotationId={quotationId}
        onFeedback={(msg, sev) =>
          setFeedback({ open: true, message: msg, severity: sev || 'success' })
        }
      />

      {/* Modals */}
      {statusDialogOpen ? (
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

      {deleteDialogOpen ? (
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
      <QuotationPdfPreviewDialog
        open={pdfPreviewOpen}
        quotationNumber={quotation.quotationNumber}
        pdfBlob={pdfBlob}
        isLoading={pdfLoading}
        error={pdfError}
        onClose={() => setPdfPreviewOpen(false)}
        onDownload={handleDownloadPdf}
      />

      {/* Feedback Snackbar */}
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

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600} sx={{ wordBreak: 'break-word' }}>
        {value}
      </Typography>
    </Box>
  );
}
