import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { RefreshIndicator } from '../../../components/common/RefreshIndicator';
import { toApiError } from '../../../services/apiClient';
import {
  downloadQuotationPdfBlobRequest,
  generateQuotationPdfRequest,
  getQuotationPdfPreviewBlobRequest,
} from '../api/quotations.api';
import { getGeneratedDocumentHistoryRequest } from '../api/quotation-documents.api';
import type { GeneratedDocumentHistoryItem } from '../quotation-documents.types';
import type { QuotationDetail } from '../quotations.types';
import { quotationDocumentsQueryKeys } from '../quotation-documents.query-keys';
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
    <Paper variant="outlined" sx={{ p: 3, mt: 3, borderRadius: 2 }} aria-busy={isLoading || showRefreshing}>
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

        <Button
          variant="contained"
          size="small"
          startIcon={<PictureAsPdfOutlinedIcon />}
          onClick={() => generatePdfMutation.mutate()}
          loading={generatePdfMutation.isPending}
          loadingPosition="start"
        >
          {generatePdfMutation.isPending ? 'Generating PDF...' : 'Generate New PDF'}
        </Button>
      </Stack>

      <Divider sx={{ mb: 2 }} />

      {/* Content */}
      <RefreshIndicator show={showRefreshing} label="Refreshing document history..." />
      {isLoading ? (
        <Stack spacing={1}>
          <Skeleton variant="rectangular" height={48} />
          <Skeleton variant="rectangular" height={48} />
        </Stack>
      ) : isError ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => refetch()}>
              Retry
            </Button>
          }
        >
          {toApiError(error).message}
        </Alert>
      ) : documents.length === 0 ? (
        <Box sx={{ py: 4, px: 2, textAlign: 'center', bgcolor: 'grey.50', borderRadius: 1 }}>
          <PictureAsPdfOutlinedIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
          <Typography variant="subtitle2" color="text.secondary">
            No generated PDF documents yet.
          </Typography>
          <Button
            size="small"
            variant="outlined"
            sx={{ mt: 1.5 }}
            onClick={() => generatePdfMutation.mutate()}
            loading={generatePdfMutation.isPending}
            loadingPosition="start"
          >
            {generatePdfMutation.isPending ? 'Generating...' : 'Generate Initial Quotation PDF'}
          </Button>
        </Box>
      ) : (
        <>
          {/* Desktop Table View */}
          <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
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
                            <IconButton
                              size="small"
                              color="primary"
                              disabled={!doc.isAvailable || (pdfLoading && activeDocId === doc.id)}
                              onClick={() => handlePreviewPdf(doc)}
                              aria-label={`Preview ${doc.displayFilename}`}
                            >
                              {pdfLoading && activeDocId === doc.id ? <CircularProgress size={18} aria-label={`Loading preview for ${doc.displayFilename}`} /> : <VisibilityOutlinedIcon fontSize="small" />}
                            </IconButton>
                          </span>
                        </Tooltip>

                        <Tooltip title={doc.isAvailable ? 'Download PDF' : 'File missing from storage'}>
                          <span>
                            <IconButton
                              size="small"
                              color="info"
                              disabled={!doc.isAvailable || downloadingId === doc.id}
                              onClick={() => handleDownloadPdf(doc)}
                              aria-label={`Download ${doc.displayFilename}`}
                            >
                              {downloadingId === doc.id ? <CircularProgress size={18} aria-label={`Downloading ${doc.displayFilename}`} /> : <DownloadOutlinedIcon fontSize="small" />}
                            </IconButton>
                          </span>
                        </Tooltip>

                        <Tooltip title={doc.isAvailable ? 'Send via Email' : 'File missing from storage'}>
                          <span>
                            <Button
                              size="small"
                              variant="outlined"
                              color="primary"
                              disabled={!doc.isAvailable || generatePdfMutation.isPending || downloadingId === doc.id || (pdfLoading && activeDocId === doc.id)}
                              startIcon={<EmailOutlinedIcon fontSize="small" />}
                              onClick={() => handleOpenEmailDialog(doc)}
                              sx={{ py: 0.25, px: 1, minWidth: 0, fontSize: '0.75rem' }}
                            >
                              Send Email
                            </Button>
                          </span>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Mobile Cards View */}
          <Stack spacing={1.5} sx={{ display: { xs: 'flex', md: 'none' } }}>
            {documents.map((doc) => (
              <Card key={doc.id} variant="outlined">
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box sx={{ overflow: 'hidden' }}>
                      <Typography variant="subtitle2" noWrap fontWeight={600}>
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

                  <Stack direction="row" justifyContent="flex-end" spacing={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={!doc.isAvailable || (pdfLoading && activeDocId === doc.id)}
                      loading={pdfLoading && activeDocId === doc.id}
                      loadingPosition="start"
                      startIcon={<VisibilityOutlinedIcon />}
                      onClick={() => handlePreviewPdf(doc)}
                    >
                      {pdfLoading && activeDocId === doc.id ? 'Loading...' : 'Preview'}
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={!doc.isAvailable}
                      loading={downloadingId === doc.id}
                      loadingPosition="start"
                      startIcon={<DownloadOutlinedIcon />}
                      onClick={() => handleDownloadPdf(doc)}
                    >
                      {downloadingId === doc.id ? 'Downloading...' : 'Download'}
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      disabled={!doc.isAvailable || generatePdfMutation.isPending || downloadingId === doc.id || (pdfLoading && activeDocId === doc.id)}
                      startIcon={<EmailOutlinedIcon />}
                      onClick={() => handleOpenEmailDialog(doc)}
                    >
                      Email
                    </Button>
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
        onSuccess={(msg) => onFeedback(msg, 'success')}
      />
    </Paper>
  );
}
