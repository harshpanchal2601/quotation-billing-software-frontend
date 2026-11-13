import { EmptyState } from '@shared/components/common/EmptyState';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { ErrorState } from '@shared/components/common/ErrorState';
import { RefreshIndicator } from '@shared/components/common/RefreshIndicator';
import { toApiError } from '@shared/api/apiClient';
import { AppButton } from '@shared/ui/actions';
import { DetailSection } from '@shared/ui/layout';
import { RecordTable, TableSkeleton } from '@shared/ui/tables';
import {
  downloadQuotationAttachmentBlobRequest,
  getQuotationAttachmentsRequest,
} from '../api/quotation-attachments.api';
import type { QuotationAttachment } from '../model/quotation-attachments.types';
import { quotationAttachmentsQueryKeys } from '../model/quotation-attachments.query-keys';
import { formatFileSize } from '../model/quotation-attachments.utils';
import { QuotationAttachmentDeleteDialog } from './QuotationAttachmentDeleteDialog';
import { QuotationAttachmentPreviewDialog } from './QuotationAttachmentPreviewDialog';
import { QuotationAttachmentUploadDialog } from './QuotationAttachmentUploadDialog';

interface QuotationAttachmentsSectionProps {
  quotationId: number;
  onFeedback: (message: string, severity?: 'success' | 'error') => void;
}

function getFileIcon(category: string) {
  switch (category) {
    case 'PDF':
      return <PictureAsPdfOutlinedIcon color="error" />;
    case 'Image':
      return <ImageOutlinedIcon color="primary" />;
    case 'Word document':
      return <DescriptionOutlinedIcon color="info" />;
    case 'Spreadsheet':
    case 'CSV':
      return <TableChartOutlinedIcon color="success" />;
    default:
      return <InsertDriveFileOutlinedIcon color="action" />;
  }
}

export function QuotationAttachmentsSection({ quotationId, onFeedback }: QuotationAttachmentsSectionProps) {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [selectedAttachment, setSelectedAttachment] = useState<QuotationAttachment | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const downloadPending = useRef(false);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: quotationAttachmentsQueryKeys.list(quotationId),
    queryFn: () => getQuotationAttachmentsRequest(quotationId),
    enabled: Boolean(quotationId && quotationId > 0),
    staleTime: 30000,
  });

  const attachments = data?.attachments || [];
  const limits = data?.limits || { maximumAttachments: 20, remainingAttachments: 20, maximumFileSizeBytes: 20971520 };

  const handlePreview = (attachment: QuotationAttachment) => {
    if (downloadingId === attachment.id) return;
    setSelectedAttachment(attachment);
    setPreviewDialogOpen(true);
  };

  const handleDownload = async (attachment: QuotationAttachment) => {
    if (downloadPending.current) return;
    downloadPending.current = true;
    try {
      setDownloadingId(attachment.id);
      const { blob, filename } = await downloadQuotationAttachmentBlobRequest(
        quotationId,
        attachment.id,
        attachment.originalFilename,
      );

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const apiError = toApiError(err);
      if (!apiError.cancelled) onFeedback(apiError.message, 'error');
    } finally {
      downloadPending.current = false;
      setDownloadingId(null);
    }
  };

  const handleDelete = (attachment: QuotationAttachment) => {
    if (downloadingId === attachment.id) return;
    setSelectedAttachment(attachment);
    setDeleteDialogOpen(true);
  };
  const showRefreshing = isFetching && !isLoading;

  return (
    <DetailSection
      title="Supporting attachments"
      description={`Upload technical drawings, layout specifications and approval documents. Maximum ${formatFileSize(limits.maximumFileSizeBytes)} per file.`}
      aria-busy={isLoading || showRefreshing}
      actions={<>
        <Chip
          label={`${attachments.length}/${limits.maximumAttachments}`}
          aria-label={`${attachments.length} of ${limits.maximumAttachments} attachment spaces used`}
          size="small"
          color={attachments.length >= limits.maximumAttachments ? 'warning' : 'default'}
        />
        <AppButton
          variant="contained"
          size="small"
          startIcon={<UploadFileOutlinedIcon />}
          onClick={() => setUploadDialogOpen(true)}
          disabled={isLoading || isError || limits.remainingAttachments <= 0}
        >
          Upload attachment
        </AppButton>
      </>}
    >
      <RefreshIndicator show={showRefreshing} label="Refreshing attachments…" />
      {isLoading ? (
        <TableSkeleton rowCount={2} rowHeight={48} />
      ) : isError ? (
        <ErrorState message={toApiError(error).message} onRetry={() => void refetch()} />
      ) : attachments.length === 0 ? (
        <EmptyState title="No supporting attachments" description="No supporting attachments uploaded for this quotation yet. Attached documents are kept separate from generated quotation PDFs." />
      ) : (
        <RecordTable rows={attachments} label="Supporting quotation attachments" rowKey={(attachment) => attachment.id} columns={[
          { key: 'type', label: 'Type', minWidth: 160, sortValue: (attachment) => attachment.fileCategory, render: (attachment) => <Stack direction="row" alignItems="center" spacing={1}>{getFileIcon(attachment.fileCategory)}<Typography variant="body2">{attachment.fileCategory}</Typography></Stack> },
          { key: 'filename', label: 'File name', minWidth: 240, sortValue: (attachment) => attachment.originalFilename, render: (attachment) => <Tooltip title={attachment.originalFilename}><Typography variant="body2" fontWeight={600} sx={{ overflowWrap: 'anywhere' }}>{attachment.originalFilename}</Typography></Tooltip> },
          { key: 'size', label: 'Size', align: 'right', sortValue: (attachment) => attachment.fileSize, render: (attachment) => formatFileSize(attachment.fileSize) },
          { key: 'uploadedAt', label: 'Uploaded date', sortValue: (attachment) => attachment.uploadedAt, render: (attachment) => new Date(attachment.uploadedAt).toLocaleDateString() },
          { key: 'uploadedBy', label: 'Uploaded by', sortValue: (attachment) => attachment.uploadedBy?.name, render: (attachment) => attachment.uploadedBy?.name || '—' },
          { key: 'actions', label: 'Actions', minWidth: 300, render: (attachment) => <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Tooltip title={attachment.canPreview ? 'Preview inline' : 'Preview is unavailable for this format. Download the file to view it.'}>
              <span><AppButton size="small" variant="outlined" startIcon={<VisibilityOutlinedIcon />} onClick={() => handlePreview(attachment)} disabled={!attachment.canPreview || downloadingId === attachment.id} aria-label={attachment.canPreview ? `Preview ${attachment.originalFilename}` : `Preview unavailable for ${attachment.originalFilename}`}>Preview</AppButton></span>
            </Tooltip>
            <AppButton size="small" variant="outlined" color="info" startIcon={<DownloadOutlinedIcon />} onClick={() => void handleDownload(attachment)} disabled={downloadingId !== null} isLoading={downloadingId === attachment.id} loadingPosition="start" loadingLabel="Downloading…" aria-label={`Download ${attachment.originalFilename}`}>Download</AppButton>
            <AppButton size="small" variant="outlined" color="error" startIcon={<DeleteOutlineOutlinedIcon />} onClick={() => handleDelete(attachment)} disabled={downloadingId === attachment.id} aria-label={`Delete ${attachment.originalFilename}`}>Delete</AppButton>
          </Stack> },
        ]} />
      )}

      {/* Dialogs */}
      <QuotationAttachmentUploadDialog
        open={uploadDialogOpen}
        quotationId={quotationId}
        remainingCapacity={limits.remainingAttachments}
        onClose={() => setUploadDialogOpen(false)}
        onSuccess={(msg) => onFeedback(msg, 'success')}
      />

      <QuotationAttachmentPreviewDialog
        open={previewDialogOpen}
        quotationId={quotationId}
        attachment={selectedAttachment}
        onClose={() => {
          setPreviewDialogOpen(false);
          setSelectedAttachment(null);
        }}
        onDownloadError={(msg) => onFeedback(msg, 'error')}
      />

      <QuotationAttachmentDeleteDialog
        open={deleteDialogOpen}
        quotationId={quotationId}
        attachment={selectedAttachment}
        onClose={() => {
          setDeleteDialogOpen(false);
          setSelectedAttachment(null);
        }}
        onSuccess={(msg) => onFeedback(msg, 'success')}
      />
    </DetailSection>
  );
}
