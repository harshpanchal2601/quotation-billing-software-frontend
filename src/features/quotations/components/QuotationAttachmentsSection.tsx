import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
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
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { RefreshIndicator } from '@shared/components/common/RefreshIndicator';
import { toApiError } from '@shared/api/apiClient';
import { AppButton, AppIconButton } from '@shared/ui/actions';
import {
  downloadQuotationAttachmentBlobRequest,
  getQuotationAttachmentsRequest,
} from '../api/quotation-attachments.api';
import type { QuotationAttachment } from '../quotation-attachments.types';
import { quotationAttachmentsQueryKeys } from '../quotation-attachments.query-keys';
import { formatFileSize } from '../quotation-attachments.utils';
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
    if (downloadingId === attachment.id) return;
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
    <Paper variant="outlined" sx={{ p: 3, mt: 3, borderRadius: 2 }} aria-busy={isLoading || showRefreshing}>
      {/* Header */}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} sx={{ mb: 2 }}>
        <Box>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="h6" component="h2" fontWeight={600}>
              Supporting Attachments
            </Typography>
            <Chip
              label={`${attachments.length}/${limits.maximumAttachments}`}
              size="small"
              color={attachments.length >= limits.maximumAttachments ? 'warning' : 'default'}
            />
          </Stack>
          <Typography variant="caption" color="text.secondary">
            Upload technical drawings, layout specifications, and approval documents (Max 20 MB per file).
          </Typography>
        </Box>

        <AppButton
          variant="contained"
          size="small"
          startIcon={<UploadFileOutlinedIcon />}
          onClick={() => setUploadDialogOpen(true)}
          disabled={limits.remainingAttachments <= 0}
        >
          Upload Attachment
        </AppButton>
      </Stack>

      <Divider sx={{ mb: 2 }} />
      <RefreshIndicator show={showRefreshing} label="Refreshing attachments..." />

      {/* Content */}
      {isLoading ? (
        <Stack spacing={1}>
          <Skeleton variant="rectangular" height={48} />
          <Skeleton variant="rectangular" height={48} />
        </Stack>
      ) : isError ? (
        <Alert
          severity="error"
          action={
            <AppButton color="inherit" size="small" onClick={() => refetch()}>
              Retry
            </AppButton>
          }
        >
          {toApiError(error).message}
        </Alert>
      ) : attachments.length === 0 ? (
        <Box sx={{ text: 'center', py: 4, px: 2, textAlign: 'center', bgcolor: 'grey.50', borderRadius: 1 }}>
          <UploadFileOutlinedIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
          <Typography variant="subtitle2" color="text.secondary">
            No supporting attachments uploaded for this quotation yet.
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
            Attached documents are kept separate from generated quotation PDFs.
          </Typography>
        </Box>
      ) : (
        <>
          {/* Desktop Table View */}
          <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Type</TableCell>
                  <TableCell>File Name</TableCell>
                  <TableCell>Size</TableCell>
                  <TableCell>Uploaded Date</TableCell>
                  <TableCell>Uploaded By</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {attachments.map((att) => (
                  <TableRow key={att.id} hover>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        {getFileIcon(att.fileCategory)}
                        <Typography variant="body2">{att.fileCategory}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, maxWidth: 260 }}>
                      <Tooltip title={att.originalFilename}>
                        <Typography variant="body2" noWrap fontWeight={600}>
                          {att.originalFilename}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{formatFileSize(att.fileSize)}</TableCell>
                    <TableCell>{new Date(att.uploadedAt).toLocaleDateString()}</TableCell>
                    <TableCell>{att.uploadedBy?.name || '—'}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        {att.canPreview ? (
                          <Tooltip title="Preview inline">
                            <AppIconButton size="small" color="primary" onClick={() => handlePreview(att)} label={`Preview ${att.originalFilename}`}>
                              <VisibilityOutlinedIcon fontSize="small" />
                            </AppIconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Preview not available for this format. Download file to view.">
                            <span>
                              <AppIconButton size="small" disabled label={`Preview unavailable for ${att.originalFilename}`}>
                                <VisibilityOutlinedIcon fontSize="small" />
                              </AppIconButton>
                            </span>
                          </Tooltip>
                        )}

                        <Tooltip title="Download file">
                          <AppIconButton
                            size="small"
                            color="info"
                            onClick={() => handleDownload(att)}
                            disabled={downloadingId === att.id}
                            label={`Download ${att.originalFilename}`}
                          >
                            {downloadingId === att.id ? <CircularProgress size={18} aria-label={`Downloading ${att.originalFilename}`} /> : <DownloadOutlinedIcon fontSize="small" />}
                          </AppIconButton>
                        </Tooltip>

                        <Tooltip title="Delete attachment">
                          <AppIconButton size="small" color="error" onClick={() => handleDelete(att)} label={`Delete ${att.originalFilename}`} disabled={downloadingId === att.id}>
                            <DeleteOutlineOutlinedIcon fontSize="small" />
                          </AppIconButton>
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
            {attachments.map((att) => (
              <Card key={att.id} variant="outlined">
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ overflow: 'hidden' }}>
                      {getFileIcon(att.fileCategory)}
                      <Box sx={{ overflow: 'hidden' }}>
                        <Typography variant="subtitle2" noWrap fontWeight={600}>
                          {att.originalFilename}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {att.fileCategory} • {formatFileSize(att.fileSize)}
                        </Typography>
                      </Box>
                    </Stack>
                  </Stack>

                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                    Uploaded on {new Date(att.uploadedAt).toLocaleDateString()} {att.uploadedBy?.name ? `by ${att.uploadedBy.name}` : ''}
                  </Typography>

                  <Divider sx={{ my: 1.5 }} />

                  <Stack direction="row" justifyContent="flex-end" spacing={1}>
                    {att.canPreview && (
                      <AppButton
                        size="small"
                        variant="outlined"
                        startIcon={<VisibilityOutlinedIcon />}
                        onClick={() => handlePreview(att)}
                        disabled={downloadingId === att.id}
                      >
                        Preview
                      </AppButton>
                    )}
                    <AppButton
                      size="small"
                      variant="outlined"
                      startIcon={<DownloadOutlinedIcon />}
                      onClick={() => handleDownload(att)}
                      isLoading={downloadingId === att.id}
                      loadingPosition="start"
                    >
                      {downloadingId === att.id ? 'Downloading...' : 'Download'}
                    </AppButton>
                    <AppButton
                      size="small"
                      color="error"
                      variant="outlined"
                      startIcon={<DeleteOutlineOutlinedIcon />}
                      onClick={() => handleDelete(att)}
                      disabled={downloadingId === att.id}
                    >
                      Delete
                    </AppButton>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </>
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
    </Paper>
  );
}
