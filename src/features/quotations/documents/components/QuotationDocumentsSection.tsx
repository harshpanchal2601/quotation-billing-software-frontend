import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Box, Chip, CircularProgress, Stack, Tooltip, Typography } from '@mui/material';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { toApiError } from '@shared/api/apiClient';
import { EmptyState } from '@shared/components/common/EmptyState';
import { ErrorState } from '@shared/components/common/ErrorState';
import { RefreshIndicator } from '@shared/components/common/RefreshIndicator';
import { AppButton, AppIconButton } from '@shared/ui/actions';
import { AppDialog } from '@shared/ui/dialogs';
import { DetailFields, DetailSection } from '@shared/ui/layout';
import { DataTableShell, RecordPagination, RecordTable, TableSkeleton, TableSortControls, useTableSort } from '@shared/ui/tables';
import { dashboardQueryKeys } from '@features/dashboard';
import { downloadQuotationPdfBlobRequest, generateQuotationPdfRequest, getQuotationPdfPreviewBlobRequest } from '../../api/quotations.api';
import { getGeneratedDocumentHistoryRequest, getQuotationCommunicationHistoryRequest } from '../api/quotation-documents.api';
import type { GeneratedDocumentHistoryItem, QuotationCommunicationHistoryItem } from '../model/quotation-documents.types';
import type { QuotationDetail } from '../../model/quotations.types';
import { quotationDocumentsQueryKeys } from '../model/quotation-documents.query-keys';
import { quotationsQueryKeys } from '../../model/quotations.query-keys';
import { QuotationPdfPreviewDialog } from './QuotationPdfPreviewDialog';
import { QuotationEmailDialog } from '../../email/components/QuotationEmailDialog';

const documentSortFields = [
  { key: 'generatedAt', label: 'Generated at' }, { key: 'versionNumber', label: 'Version' },
  { key: 'documentType', label: 'Type' }, { key: 'id', label: 'Record number' },
];
const communicationSortFields = [
  { key: 'createdAt', label: 'Created at' }, { key: 'status', label: 'Status' },
  { key: 'subjectSnapshot', label: 'Subject' }, { key: 'attemptNumber', label: 'Attempt' }, { key: 'id', label: 'Record number' },
];

interface QuotationDocumentsSectionProps {
  quotation: QuotationDetail;
  canManageDocuments: boolean;
  canEmail: boolean;
  onFeedback: (message: string, severity?: 'success' | 'error') => void;
}

export function QuotationDocumentsSection({ quotation, canManageDocuments, canEmail, onFeedback }: QuotationDocumentsSectionProps) {
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const page = Math.min(100000, Math.max(1, Math.trunc(Number(params.get('documentsPage'))) || 1));
  const communicationPage = Math.min(100000, Math.max(1, Math.trunc(Number(params.get('communicationsPage'))) || 1));
  const changePage = (key: string, value: number) => setParams((current) => {
    const next = new URLSearchParams(current); next.set(key, String(value)); return next;
  }, { replace: true });
  const documentSorting = useTableSort(documentSortFields, { defaultSortBy: 'generatedAt', paramPrefix: 'documents' });
  const communicationSorting = useTableSort(communicationSortFields, { defaultSortBy: 'createdAt', paramPrefix: 'communications' });
  const documentParams = { page, limit: 20, sortBy: documentSorting.sortBy, sortOrder: documentSorting.sortOrder };
  const communicationParams = { page: communicationPage, limit: 20, sortBy: communicationSorting.sortBy, sortOrder: communicationSorting.sortOrder };
  const history = useQuery({
    queryKey: quotationDocumentsQueryKeys.list(quotation.id, documentParams),
    queryFn: () => getGeneratedDocumentHistoryRequest(quotation.id, documentParams),
    enabled: quotation.id > 0, staleTime: 30000,
  });
  const communicationHistory = useQuery({
    queryKey: quotationDocumentsQueryKeys.communications(quotation.id, communicationParams),
    queryFn: () => getQuotationCommunicationHistoryRequest(quotation.id, communicationParams),
    enabled: canEmail && quotation.id > 0, staleTime: 30000,
  });
  const documents = history.data?.documents ?? [];
  const communications = communicationHistory.data?.communications ?? [];
  const [previewDocument, setPreviewDocument] = useState<GeneratedDocumentHistoryItem | null>(null);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const previewInFlight = useRef(false);
  const downloadInFlight = useRef(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [selectedDocForEmail, setSelectedDocForEmail] = useState<GeneratedDocumentHistoryItem | null>(null);
  const [selectedCommunication, setSelectedCommunication] = useState<QuotationCommunicationHistoryItem | null>(null);
  const generatePdfMutation = useMutation({
    mutationFn: () => generateQuotationPdfRequest(quotation.id),
    onSuccess: () => {
      onFeedback('New quotation PDF generated successfully', 'success');
      changePage('documentsPage', 1);
      void queryClient.invalidateQueries({ queryKey: quotationDocumentsQueryKeys.all });
    },
    onError: (error) => {
      const apiError = toApiError(error);
      if (!apiError.cancelled) onFeedback(apiError.message, 'error');
    },
  });
  const handlePreviewPdf = async (doc: GeneratedDocumentHistoryItem) => {
    if (previewInFlight.current) return;
    previewInFlight.current = true;
    setPreviewDocument(doc); setPdfPreviewOpen(true); setPdfLoading(true); setPdfError(null); setPdfBlob(null);
    try { setPdfBlob(await getQuotationPdfPreviewBlobRequest(quotation.id, doc.id)); }
    catch (error) { const apiError = toApiError(error); if (!apiError.cancelled) setPdfError(apiError.message); }
    finally { previewInFlight.current = false; setPdfLoading(false); }
  };
  const handleDownloadPdf = async (doc: GeneratedDocumentHistoryItem) => {
    if (downloadInFlight.current) return;
    downloadInFlight.current = true; setDownloadingId(doc.id);
    try {
      const { blob, filename } = await downloadQuotationPdfBlobRequest(quotation.id, doc.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = filename || doc.displayFilename;
      document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    } catch (error) { const apiError = toApiError(error); if (!apiError.cancelled) onFeedback(apiError.message, 'error'); }
    finally { downloadInFlight.current = false; setDownloadingId(null); }
  };

  return <Stack spacing={3} sx={{ mt: 3, minWidth: 0 }}>
    <DetailSection title="Generated Documents" description="Saved versions of generated quotation PDFs. Supporting files are managed under Attachments."
      actions={canManageDocuments ? <AppButton variant="contained" size="small" startIcon={<PictureAsPdfOutlinedIcon />} onClick={() => generatePdfMutation.mutate()} isLoading={generatePdfMutation.isPending} loadingPosition="start">{generatePdfMutation.isPending ? 'Generating PDF...' : 'Generate New PDF'}</AppButton> : undefined}>
      <Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">{history.data?.pagination.total ?? 0} saved version{history.data?.pagination.total === 1 ? '' : 's'}</Typography>
        <TableSortControls {...documentSorting} />
        <DataTableShell wrapInTableContainer={false} isLoading={history.isLoading} isError={history.isError} isEmpty={documents.length === 0}
          isRefreshing={history.isFetching && !history.isLoading} refreshIndicator={<RefreshIndicator show={history.isFetching && !history.isLoading} label="Refreshing document history..." />}
          loadingContent={<TableSkeleton rowCount={2} rowHeight={48} />} errorContent={<ErrorState message={toApiError(history.error).message} onRetry={() => void history.refetch()} />}
          emptyContent={<EmptyState title="No generated PDF documents" description="Generate a quotation PDF to see saved versions here." />}>
          <RecordTable rows={documents} rowKey={(doc) => doc.id} label="Generated quotation documents" rowNumberStart={(page - 1) * 20 + 1} sorting={documentSorting} showSortControls={false} columns={[
            { key: 'version', label: 'Version', sortKey: 'versionNumber', render: (doc) => `v${doc.versionNumber}` },
            { key: 'name', label: 'Document name', minWidth: 280, render: (doc) => doc.displayFilename },
            { key: 'type', label: 'Type', sortKey: 'documentType', render: (doc) => doc.documentType === 'QUOTATION_PDF' ? 'Quotation PDF' : doc.documentType },
            { key: 'date', label: 'Generated at', sortKey: 'generatedAt', render: (doc) => new Date(doc.generatedAt).toLocaleString() },
            { key: 'by', label: 'Generated by', render: (doc) => doc.generatedBy?.name ?? 'User unavailable' },
            { key: 'status', label: 'Status', render: (doc) => <Chip label={doc.isAvailable ? 'Available' : 'File missing'} size="small" color={doc.isAvailable ? 'success' : 'error'} variant="outlined" /> },
            { key: 'actions', label: 'Actions', minWidth: 240, render: (doc) => <Stack direction="row" spacing={0.5} alignItems="center">
              {canManageDocuments ? <>
                <Tooltip title={doc.isAvailable ? 'Preview PDF' : 'File missing from storage'}><span><AppIconButton size="small" color="primary" disabled={!doc.canPreview || pdfLoading} onClick={() => void handlePreviewPdf(doc)} label={`Preview ${doc.displayFilename}`}>{pdfLoading && previewDocument?.id === doc.id ? <CircularProgress size={18} /> : <VisibilityOutlinedIcon fontSize="small" />}</AppIconButton></span></Tooltip>
                <Tooltip title={doc.isAvailable ? 'Download PDF' : 'File missing from storage'}><span><AppIconButton size="small" disabled={!doc.isAvailable || downloadingId !== null} onClick={() => void handleDownloadPdf(doc)} label={`Download ${doc.displayFilename}`}>{downloadingId === doc.id ? <CircularProgress size={18} /> : <DownloadOutlinedIcon fontSize="small" />}</AppIconButton></span></Tooltip>
              </> : null}
              {canEmail ? <AppButton size="small" variant="outlined" disabled={!doc.canEmail || generatePdfMutation.isPending || downloadingId !== null || pdfLoading} startIcon={<EmailOutlinedIcon />} onClick={() => setSelectedDocForEmail(doc)}>Send Email</AppButton> : null}
            </Stack> },
          ]} />
        </DataTableShell>
        {!history.isError ? <RecordPagination pagination={history.data?.pagination} page={page} change={(value) => changePage('documentsPage', value)} /> : null}
      </Stack>
    </DetailSection>
    {canEmail ? <DetailSection title="Communication History" description="Email attempts for this quotation revision. Acceptance by the email server does not confirm delivery to the recipient.">
      <Stack spacing={2}>
        <TableSortControls {...communicationSorting} />
        <DataTableShell wrapInTableContainer={false} isLoading={communicationHistory.isLoading} isError={communicationHistory.isError} isEmpty={communications.length === 0}
          isRefreshing={communicationHistory.isFetching && !communicationHistory.isLoading} refreshIndicator={<RefreshIndicator show={communicationHistory.isFetching && !communicationHistory.isLoading} label="Refreshing communication history..." />}
          loadingContent={<TableSkeleton rowCount={2} rowHeight={48} />} errorContent={<ErrorState message={toApiError(communicationHistory.error).message} onRetry={() => void communicationHistory.refetch()} />}
          emptyContent={<EmptyState title="No email history" description="Emails sent from this quotation will appear here." />}>
          <RecordTable rows={communications} rowKey={(communication) => communication.id} label="Quotation communication history" rowNumberStart={(communicationPage - 1) * 20 + 1} sorting={communicationSorting} showSortControls={false} columns={[
            { key: 'status', label: 'Status', sortKey: 'status', minWidth: 220, render: (communication) => <CommunicationStatusChip communication={communication} /> },
            { key: 'recipients', label: 'Recipients', minWidth: 240, render: (communication) => <Box><Typography variant="body2">To: {communication.to.join(', ')}</Typography>{communication.cc.length ? <Typography variant="caption" display="block">CC: {communication.cc.join(', ')}</Typography> : null}{communication.bcc.length ? <Typography variant="caption" display="block">BCC: {communication.bcc.join(', ')}</Typography> : null}</Box> },
            { key: 'subject', label: 'Subject', sortKey: 'subjectSnapshot', minWidth: 220, render: (communication) => <Box>{communication.subject}{communication.failureSummary ? <Typography variant="caption" color="error" display="block">{communication.failureSummary}</Typography> : null}</Box> },
            { key: 'document', label: 'PDF', minWidth: 240, render: getDocumentLabel },
            { key: 'revision', label: 'Revision', render: getRevisionLabel },
            { key: 'attachments', label: 'Attachments', render: getAttachmentSummary },
            { key: 'sender', label: 'Sent by', render: (communication) => communication.sender?.name ?? 'User unavailable' },
            { key: 'created', label: 'Created at', sortKey: 'createdAt', render: (communication) => new Date(communication.createdAt).toLocaleString() },
            { key: 'timestamp', label: 'Last update', render: getTimestampLabel },
            { key: 'actions', label: 'Actions', render: (communication) => <AppButton size="small" variant="outlined" onClick={() => setSelectedCommunication(communication)}>View email details</AppButton> },
          ]} />
        </DataTableShell>
        {!communicationHistory.isError ? <RecordPagination pagination={communicationHistory.data?.pagination} page={communicationPage} change={(value) => changePage('communicationsPage', value)} /> : null}
      </Stack>
    </DetailSection> : null}
    {canManageDocuments ? <QuotationPdfPreviewDialog open={pdfPreviewOpen} quotationNumber={previewDocument?.quotationNumber ?? ''} pdfBlob={pdfBlob} isLoading={pdfLoading} error={pdfError} onClose={() => setPdfPreviewOpen(false)} onDownload={() => { if (previewDocument) void handleDownloadPdf(previewDocument); }} /> : null}
    {canEmail ? <QuotationEmailDialog open={selectedDocForEmail !== null} quotation={quotation} document={selectedDocForEmail} onClose={() => setSelectedDocForEmail(null)} onSuccess={(message) => {
      onFeedback(message, 'success');
      void queryClient.invalidateQueries({ queryKey: quotationDocumentsQueryKeys.communications(quotation.id) });
      void queryClient.invalidateQueries({ queryKey: quotationsQueryKeys.detail(quotation.id) });
      void queryClient.invalidateQueries({ queryKey: quotationsQueryKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all });
    }} /> : null}
    <AppDialog open={selectedCommunication !== null} title="Email details" fullWidth maxWidth="md" showCloseButton onClose={() => setSelectedCommunication(null)} actions={<AppButton onClick={() => setSelectedCommunication(null)}>Close</AppButton>}>
      {selectedCommunication ? <Stack spacing={2}>
        <DetailSection title="Email summary"><DetailFields fields={[
          { label: 'Subject', value: selectedCommunication.subject }, { label: 'Status', value: <CommunicationStatusChip communication={selectedCommunication} /> },
          { label: 'To', value: selectedCommunication.to.join(', ') }, { label: 'CC', value: selectedCommunication.cc.join(', ') || 'None' },
          { label: 'BCC', value: selectedCommunication.bcc.join(', ') || 'None' }, { label: 'Sent by', value: selectedCommunication.sender?.name ?? 'User unavailable' },
          { label: 'PDF', value: getDocumentLabel(selectedCommunication) }, { label: 'Revision', value: getRevisionLabel(selectedCommunication) },
          { label: 'Attempt', value: selectedCommunication.attemptNumber }, { label: 'Last update', value: getTimestampLabel(selectedCommunication) },
        ]} /></DetailSection>
        <DetailSection title="Message"><Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{selectedCommunication.message}</Typography></DetailSection>
        <DetailSection title="Supporting attachments"><Typography variant="body2">{getAttachmentNames(selectedCommunication)}</Typography></DetailSection>
        {selectedCommunication.failureSummary ? <DetailSection title="Failure"><Typography variant="body2" color="error">{selectedCommunication.failureSummary}</Typography></DetailSection> : null}
      </Stack> : null}
    </AppDialog>
  </Stack>;
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
