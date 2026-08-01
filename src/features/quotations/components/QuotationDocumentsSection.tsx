import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined';
import KeyboardArrowRightOutlinedIcon from '@mui/icons-material/KeyboardArrowRightOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Fragment, useState } from 'react';

import { ErrorState } from '@shared/components/common/ErrorState';
import { RefreshIndicator } from '@shared/components/common/RefreshIndicator';
import { toApiError } from '@shared/api/apiClient';
import { AppButton, AppIconButton } from '@shared/ui/actions';
import { DataTableShell, TableSkeleton } from '@shared/ui/tables';
import {
  downloadQuotationPdfBlobRequest,
  generateQuotationPdfRequest,
  getQuotationPdfPreviewBlobRequest,
} from '../api/quotations.api';
import {
  getGeneratedDocumentHistoryRequest,
  getQuotationCommunicationHistoryRequest,
} from '../api/quotation-documents.api';
import type { GeneratedDocumentHistoryItem, QuotationCommunicationHistoryItem } from '../quotation-documents.types';
import type { QuotationDetail } from '../quotations.types';
import { quotationDocumentsQueryKeys } from '../quotation-documents.query-keys';
import { quotationsQueryKeys } from '../quotations.query-keys';
import { dashboardQueryKeys } from '@features/dashboard';
import { QuotationPdfPreviewDialog } from './QuotationPdfPreviewDialog';
import { QuotationEmailDialog } from './QuotationEmailDialog';

interface QuotationDocumentsSectionProps {
  quotation: QuotationDetail;
  onFeedback: (message: string, severity?: 'success' | 'error') => void;
}

export function QuotationDocumentsSection({ quotation, onFeedback }: QuotationDocumentsSectionProps) {
  const queryClient = useQueryClient();

  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [activeDocNumber, setActiveDocNumber] = useState<string>('');
  const [activeDocId, setActiveDocId] = useState<number | null>(null);

  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [selectedDocForEmail, setSelectedDocForEmail] = useState<GeneratedDocumentHistoryItem | null>(null);

  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: quotationDocumentsQueryKeys.list(quotation.id),
    queryFn: () => getGeneratedDocumentHistoryRequest(quotation.id),
    enabled: Boolean(quotation.id && quotation.id > 0),
    staleTime: 30000,
  });

  const documents = data?.documents || [];

  const {
    data: communicationData,
    isLoading: communicationsLoading,
    isError: communicationsIsError,
    error: communicationsError,
    refetch: refetchCommunications,
    isFetching: communicationsFetching,
  } = useQuery({
    queryKey: quotationDocumentsQueryKeys.communications(quotation.id),
    queryFn: () => getQuotationCommunicationHistoryRequest(quotation.id),
    enabled: Boolean(quotation.id && quotation.id > 0),
    staleTime: 30000,
  });

  const communications = communicationData?.communications || [];

  const generatePdfMutation = useMutation({
    mutationFn: () => generateQuotationPdfRequest(quotation.id),
    onSuccess: () => {
      onFeedback('New quotation PDF generated successfully', 'success');
      queryClient.invalidateQueries({ queryKey: quotationDocumentsQueryKeys.all });
    },
    onError: (error) => {
      const apiError = toApiError(error);
      if (!apiError.cancelled) onFeedback(apiError.message, 'error');
    },
  });

  const handlePreviewPdf = async (doc: GeneratedDocumentHistoryItem) => {
    if (pdfLoading) return;
    setActiveDocNumber(doc.quotationNumber);
    setActiveDocId(doc.id);
    setPdfPreviewOpen(true);
    setPdfLoading(true);
    setPdfError(null);
    setPdfBlob(null);

    try {
      const blob = await getQuotationPdfPreviewBlobRequest(quotation.id, doc.id);
      setPdfBlob(blob);
    } catch (err: unknown) {
      const apiError = toApiError(err);
      if (!apiError.cancelled) setPdfError(apiError.message);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDownloadPdf = async (doc: GeneratedDocumentHistoryItem) => {
    if (downloadingId === doc.id) return;
    try {
      setDownloadingId(doc.id);
      const { blob, filename } = await downloadQuotationPdfBlobRequest(quotation.id, doc.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || doc.displayFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const apiError = toApiError(err);
      if (!apiError.cancelled) onFeedback(apiError.message, 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleOpenEmailDialog = (doc: GeneratedDocumentHistoryItem) => {
    if (generatePdfMutation.isPending || downloadingId === doc.id || pdfLoading) return;
    setSelectedDocForEmail(doc);
    setEmailDialogOpen(true);
  };
  const showRefreshing = isFetching && !isLoading;

  return (
    <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 3 }, mt: 3, borderRadius: 2 }} aria-busy={isLoading || showRefreshing}>
      {/* Header */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Box>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="h6" component="h2" fontWeight={600}>
              Generated Documents
            </Typography>
            <Chip label={`${documents.length} version${documents.length === 1 ? '' : 's'}`} size="small" />
          </Stack>
          <Typography variant="caption" color="text.secondary">
            Immutable history of generated quotation PDFs. Uploaded supporting files are managed under Attachments.
          </Typography>
        </Box>

        <AppButton
          variant="contained"
          size="small"
          startIcon={<PictureAsPdfOutlinedIcon />}
          onClick={() => generatePdfMutation.mutate()}
          isLoading={generatePdfMutation.isPending}
          loadingPosition="start"
        >
          {generatePdfMutation.isPending ? 'Generating PDF...' : 'Generate New PDF'}
        </AppButton>
      </Stack>

      <Divider sx={{ mb: 2 }} />

      {/* Content */}
      <RefreshIndicator show={showRefreshing} label="Refreshing document history..." />
      {isLoading ? (
        <TableSkeleton rowCount={2} rowHeight={48} />
      ) : isError ? (
        <ErrorState message={toApiError(error).message} onRetry={() => void refetch()} />
      ) : documents.length === 0 ? (
        <Box sx={{ py: 4, px: 2, textAlign: 'center', bgcolor: 'grey.50', borderRadius: 1 }}>
          <PictureAsPdfOutlinedIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
          <Typography variant="subtitle2" color="text.secondary">
            No generated PDF documents yet.
          </Typography>
          <AppButton
            size="small"
            variant="outlined"
            sx={{ mt: 1.5 }}
            onClick={() => generatePdfMutation.mutate()}
            isLoading={generatePdfMutation.isPending}
            loadingPosition="start"
          >
            {generatePdfMutation.isPending ? 'Generating...' : 'Generate Initial Quotation PDF'}
          </AppButton>
        </Box>
      ) : (
        <>
          {/* Desktop Table View */}
          <DataTableShell
            isLoading={false}
            isError={false}
            isEmpty={false}
            loadingContent={null}
            errorContent={null}
            emptyContent={null}
            tableContainerProps={{ sx: { display: { xs: 'none', md: 'block' } } }}
          >
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Version</TableCell>
                  <TableCell>Document Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Generated At</TableCell>
                  <TableCell>Generated By</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>v{doc.versionNumber}</TableCell>
                    <TableCell sx={{ fontWeight: 600, wordBreak: 'break-word', whiteSpace: 'normal' }}>{doc.displayFilename}</TableCell>
                    <TableCell>
                      <Chip label={doc.documentType} size="small" variant="outlined" color="primary" />
                    </TableCell>
                    <TableCell>{new Date(doc.generatedAt).toLocaleString()}</TableCell>
                    <TableCell>{doc.generatedBy?.name || 'Admin'}</TableCell>
                    <TableCell>
                      {doc.isAvailable ? (
                        <Chip label="Available" size="small" color="success" variant="outlined" />
                      ) : (
                        <Chip label="File Missing" size="small" color="error" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title={doc.isAvailable ? 'Preview PDF' : 'File missing from storage'}>
                          <span>
                            <AppIconButton
                              size="small"
                              color="primary"
                              disabled={!doc.isAvailable || (pdfLoading && activeDocId === doc.id)}
                              onClick={() => handlePreviewPdf(doc)}
                              label={`Preview ${doc.displayFilename}`}
                            >
                              {pdfLoading && activeDocId === doc.id ? <CircularProgress size={18} aria-label={`Loading preview for ${doc.displayFilename}`} /> : <VisibilityOutlinedIcon fontSize="small" />}
                            </AppIconButton>
                          </span>
                        </Tooltip>

                        <Tooltip title={doc.isAvailable ? 'Download PDF' : 'File missing from storage'}>
                          <span>
                            <AppIconButton
                              size="small"
                              color="info"
                              disabled={!doc.isAvailable || downloadingId === doc.id}
                              onClick={() => handleDownloadPdf(doc)}
                              label={`Download ${doc.displayFilename}`}
                            >
                              {downloadingId === doc.id ? <CircularProgress size={18} aria-label={`Downloading ${doc.displayFilename}`} /> : <DownloadOutlinedIcon fontSize="small" />}
                            </AppIconButton>
                          </span>
                        </Tooltip>

                        <Tooltip title={doc.isAvailable ? 'Send via Email' : 'File missing from storage'}>
                          <span>
                            <AppButton
                              size="small"
                              variant="outlined"
                              color="primary"
                              disabled={!doc.isAvailable || generatePdfMutation.isPending || downloadingId === doc.id || (pdfLoading && activeDocId === doc.id)}
                              startIcon={<EmailOutlinedIcon fontSize="small" />}
                              onClick={() => handleOpenEmailDialog(doc)}
                              sx={{ py: 0.25, px: 1, minWidth: 0, fontSize: '0.75rem' }}
                            >
                              Send Email
                            </AppButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTableShell>

          {/* Mobile Cards View */}
          <Stack spacing={1.5} sx={{ display: { xs: 'flex', md: 'none' } }}>
            {documents.map((doc) => (
              <Card key={doc.id} variant="outlined">
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle2" fontWeight={600} sx={{ wordBreak: 'break-word' }}>
                        {doc.displayFilename}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Version {doc.versionNumber} • {new Date(doc.generatedAt).toLocaleString()}
                      </Typography>
                    </Box>
                    <Chip
                      label={doc.isAvailable ? 'Available' : 'Missing'}
                      size="small"
                      color={doc.isAvailable ? 'success' : 'error'}
                    />
                  </Stack>

                  <Divider sx={{ my: 1.5 }} />

                  <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="flex-end" spacing={1}>
                    <AppButton
                      size="small"
                      variant="outlined"
                      disabled={!doc.isAvailable || (pdfLoading && activeDocId === doc.id)}
                      isLoading={pdfLoading && activeDocId === doc.id}
                      loadingPosition="start"
                      startIcon={<VisibilityOutlinedIcon />}
                      onClick={() => handlePreviewPdf(doc)}
                    >
                      {pdfLoading && activeDocId === doc.id ? 'Loading...' : 'Preview'}
                    </AppButton>
                    <AppButton
                      size="small"
                      variant="outlined"
                      disabled={!doc.isAvailable}
                      isLoading={downloadingId === doc.id}
                      loadingPosition="start"
                      startIcon={<DownloadOutlinedIcon />}
                      onClick={() => handleDownloadPdf(doc)}
                    >
                      {downloadingId === doc.id ? 'Downloading...' : 'Download'}
                    </AppButton>
                    <AppButton
                      size="small"
                      variant="contained"
                      disabled={!doc.isAvailable || generatePdfMutation.isPending || downloadingId === doc.id || (pdfLoading && activeDocId === doc.id)}
                      startIcon={<EmailOutlinedIcon />}
                      onClick={() => handleOpenEmailDialog(doc)}
                    >
                      Email
                    </AppButton>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </>
      )}

      {/* PDF Preview Dialog */}
      <QuotationPdfPreviewDialog
        open={pdfPreviewOpen}
        quotationNumber={activeDocNumber}
        pdfBlob={pdfBlob}
        isLoading={pdfLoading}
        error={pdfError}
        onClose={() => setPdfPreviewOpen(false)}
        onDownload={() => {
          const activeDocument = documents.find((doc) => doc.id === activeDocId);
          if (activeDocument) handleDownloadPdf(activeDocument);
        }}
      />

      {/* Email Dialog */}
      <QuotationEmailDialog
        open={emailDialogOpen}
        quotation={quotation}
        document={selectedDocForEmail}
        onClose={() => {
          setEmailDialogOpen(false);
          setSelectedDocForEmail(null);
        }}
        onSuccess={(msg) => {
          onFeedback(msg, 'success');
          queryClient.invalidateQueries({ queryKey: quotationDocumentsQueryKeys.communications(quotation.id) });
          queryClient.invalidateQueries({ queryKey: quotationsQueryKeys.detail(quotation.id) });
          queryClient.invalidateQueries({ queryKey: quotationsQueryKeys.lists() });
          queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all });
        }}
      />

      <CommunicationHistorySection
        communications={communications}
        isLoading={communicationsLoading}
        isRefreshing={communicationsFetching && !communicationsLoading}
        isError={communicationsIsError}
        error={communicationsError}
        onRetry={refetchCommunications}
      />
    </Paper>
  );
}

function CommunicationHistorySection({
  communications,
  isLoading,
  isRefreshing,
  isError,
  error,
  onRetry,
}: {
  communications: QuotationCommunicationHistoryItem[];
  isLoading: boolean;
  isRefreshing: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  const [expandedCommunicationId, setExpandedCommunicationId] = useState<number | null>(null);
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box sx={{ mt: 3 }}>
      <Divider sx={{ mb: 2 }} />
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Box>
          <Typography variant="h6" component="h2" fontWeight={600}>
            Communication History
          </Typography>
          <Typography variant="caption" color="text.secondary">
            SMTP acceptance history for this exact quotation revision.
          </Typography>
        </Box>
        <Chip label={`${communications.length} attempt${communications.length === 1 ? '' : 's'}`} size="small" />
      </Stack>
      <RefreshIndicator show={isRefreshing} label="Refreshing communication history..." />

      {isLoading ? (
        <TableSkeleton rowCount={2} rowHeight={48} />
      ) : isError ? (
        <ErrorState message={toApiError(error).message} onRetry={onRetry} />
      ) : communications.length === 0 ? (
        <Box sx={{ py: 3, px: 2, textAlign: 'center', bgcolor: 'grey.50', borderRadius: 1 }}>
          <EmailOutlinedIcon sx={{ fontSize: 32, color: 'text.secondary', mb: 1 }} />
          <Typography variant="subtitle2" color="text.secondary">
            No email attempts recorded for this quotation revision.
          </Typography>
        </Box>
      ) : (
        isCompact ? (
          <Stack spacing={1.5} aria-label="Communication history cards">
            {communications.map((communication) => {
              const isExpanded = expandedCommunicationId === communication.id;
              const detailId = `communication-${communication.id}-mobile-details`;

              return (
                <Card key={communication.id} variant="outlined">
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="flex-start">
                      <Box sx={{ minWidth: 0 }}>
                        <CommunicationStatusChip communication={communication} />
                        <Typography variant="body2" fontWeight={600} sx={{ mt: 1, wordBreak: 'break-word' }}>
                          {communication.subject}
                        </Typography>
                        {communication.failureSummary ? (
                          <Typography variant="caption" color="error.main" display="block" sx={{ wordBreak: 'break-word' }}>
                            {communication.failureSummary}
                          </Typography>
                        ) : null}
                      </Box>
                      <AppIconButton
                        size="small"
                        label={isExpanded ? 'Collapse communication details' : 'Expand communication details'}
                        aria-expanded={isExpanded}
                        aria-controls={detailId}
                        onClick={() => setExpandedCommunicationId(isExpanded ? null : communication.id)}
                      >
                        {isExpanded ? (
                          <KeyboardArrowDownOutlinedIcon fontSize="small" />
                        ) : (
                          <KeyboardArrowRightOutlinedIcon fontSize="small" />
                        )}
                      </AppIconButton>
                    </Stack>

                    <Divider sx={{ my: 1.5 }} />

                    <Stack spacing={1}>
                      <DetailRow label="Recipients" value={`To: ${communication.to.join(', ')}`} />
                      {communication.cc.length > 0 ? <DetailRow label="CC" value={communication.cc.join(', ')} /> : null}
                      {communication.bcc.length > 0 ? <DetailRow label="BCC" value={communication.bcc.join(', ')} /> : null}
                      <DetailRow label="PDF" value={getDocumentLabel(communication)} />
                      <DetailRow label="Revision" value={getRevisionLabel(communication)} />
                      <DetailRow label="Attachments" value={getAttachmentSummary(communication)} />
                      <DetailRow label="Sent By" value={communication.sender?.name || 'Admin'} />
                      <DetailRow label="Timestamp" value={getTimestampLabel(communication)} />
                    </Stack>

                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                      <Box id={detailId} sx={{ pt: 2 }}>
                        <CommunicationExpandedDetails communication={communication} />
                      </Box>
                    </Collapse>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        ) : (
        <DataTableShell
          isLoading={false}
          isError={false}
          isEmpty={false}
          loadingContent={null}
          errorContent={null}
          emptyContent={null}
        >
          <Table size="small" sx={{ minWidth: 1120 }}>
            <TableHead>
              <TableRow>
                <TableCell width={48} />
                <TableCell>Status</TableCell>
                <TableCell>Recipients</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell>PDF</TableCell>
                <TableCell>Revision</TableCell>
                <TableCell>Attachments</TableCell>
                <TableCell>Sent By</TableCell>
                <TableCell>Timestamp</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {communications.map((communication) => {
                const isExpanded = expandedCommunicationId === communication.id;
                const detailId = `communication-${communication.id}-details`;

                return (
                  <Fragment key={communication.id}>
                    <TableRow key={communication.id} hover>
                      <TableCell>
                        <AppIconButton
                          size="small"
                          label={isExpanded ? 'Collapse communication details' : 'Expand communication details'}
                          aria-expanded={isExpanded}
                          aria-controls={detailId}
                          onClick={() => setExpandedCommunicationId(isExpanded ? null : communication.id)}
                        >
                          {isExpanded ? (
                            <KeyboardArrowDownOutlinedIcon fontSize="small" />
                          ) : (
                            <KeyboardArrowRightOutlinedIcon fontSize="small" />
                          )}
                        </AppIconButton>
                      </TableCell>
                      <TableCell>
                        <CommunicationStatusChip communication={communication} />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 260 }}>
                        <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                          To: {communication.to.join(', ')}
                        </Typography>
                        {communication.cc.length > 0 ? (
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ wordBreak: 'break-word' }}>
                            CC: {communication.cc.join(', ')}
                          </Typography>
                        ) : null}
                        {communication.bcc.length > 0 ? (
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ wordBreak: 'break-word' }}>
                            BCC: {communication.bcc.join(', ')}
                          </Typography>
                        ) : null}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 260 }}>
                        <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                          {communication.subject}
                        </Typography>
                        {communication.failureSummary ? (
                          <Typography variant="caption" color="error.main" display="block">
                            {communication.failureSummary}
                          </Typography>
                        ) : null}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 220, wordBreak: 'break-word' }}>{getDocumentLabel(communication)}</TableCell>
                      <TableCell>{getRevisionLabel(communication)}</TableCell>
                      <TableCell>{getAttachmentSummary(communication)}</TableCell>
                      <TableCell>{communication.sender?.name || 'Admin'}</TableCell>
                      <TableCell>
                        {getTimestampLabel(communication)}
                      </TableCell>
                    </TableRow>
                    <TableRow key={`${communication.id}-details`}>
                      <TableCell colSpan={9} sx={{ py: 0, borderBottom: isExpanded ? undefined : 0 }}>
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Box id={detailId} sx={{ py: 2 }}>
                            <CommunicationExpandedDetails communication={communication} />
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </DataTableShell>
        )
      )}
    </Box>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
        {value}
      </Typography>
    </Box>
  );
}

function CommunicationExpandedDetails({ communication }: { communication: QuotationCommunicationHistoryItem }) {
  return (
    <Stack spacing={1.5}>
      <Box>
        <Typography variant="caption" color="text.secondary" display="block">
          Message
        </Typography>
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {communication.message}
        </Typography>
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary" display="block">
          Supporting attachments
        </Typography>
        <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
          {getAttachmentNames(communication)}
        </Typography>
      </Box>
      {communication.failureSummary ? (
        <Box>
          <Typography variant="caption" color="text.secondary" display="block">
            Failure
          </Typography>
          <Typography variant="body2" color="error.main" sx={{ wordBreak: 'break-word' }}>
            {communication.failureSummary}
          </Typography>
        </Box>
      ) : null}
    </Stack>
  );
}

function CommunicationStatusChip({ communication }: { communication: QuotationCommunicationHistoryItem }) {
  if (communication.status === 'ACCEPTED') {
    return <Chip label="Accepted by email server" size="small" color="success" variant="outlined" />;
  }
  if (communication.status === 'FAILED') {
    return <Chip label="Failed" size="small" color="error" variant="outlined" />;
  }
  return <Chip label="Sending" size="small" color="warning" variant="outlined" />;
}

function getDocumentLabel(communication: QuotationCommunicationHistoryItem) {
  const filename = communication.document?.displayFilename;
  if (filename) return filename;
  return communication.generatedDocumentId ? `Document #${communication.generatedDocumentId}` : '-';
}

function getRevisionLabel(communication: QuotationCommunicationHistoryItem) {
  return typeof communication.quotationRevisionNumber === 'number'
    ? `Revision ${communication.quotationRevisionNumber}`
    : 'Revision unavailable';
}

function getCommunicationAttachments(communication: QuotationCommunicationHistoryItem) {
  return Array.isArray(communication.attachments) ? communication.attachments : [];
}

function getAttachmentSummary(communication: QuotationCommunicationHistoryItem) {
  const attachments = getCommunicationAttachments(communication);
  if (attachments.length === 0) return 'None';
  return `${attachments.length} file${attachments.length === 1 ? '' : 's'}`;
}

function getAttachmentNames(communication: QuotationCommunicationHistoryItem) {
  const attachments = getCommunicationAttachments(communication);
  if (attachments.length === 0) return 'No supporting attachments selected.';
  return attachments.map((attachment) => attachment.originalFilename).join(', ');
}

function getTimestampLabel(communication: QuotationCommunicationHistoryItem) {
  return new Date(communication.acceptedAt || communication.failedAt || communication.createdAt).toLocaleString();
}
