import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useEffect, useState } from 'react';

import { AppButton } from '@shared/ui/actions';
import { AppDialog } from '@shared/ui/dialogs';
import { InlineLoader, ServerErrorAlert } from '@shared/ui/feedback';
import {
  downloadQuotationAttachmentBlobRequest,
  getQuotationAttachmentPreviewBlobRequest,
} from '../api/quotation-attachments.api';
import { toApiError } from '@shared/api/apiClient';
import type { QuotationAttachment } from '../model/quotation-attachments.types';
import { formatFileSize } from '../model/quotation-attachments.utils';

interface QuotationAttachmentPreviewDialogProps {
  open: boolean;
  quotationId: number;
  attachment: QuotationAttachment | null;
  onClose: () => void;
  onDownloadError?: (message: string) => void;
}

export function QuotationAttachmentPreviewDialog({
  open,
  quotationId,
  attachment,
  onClose,
  onDownloadError,
}: QuotationAttachmentPreviewDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;

    if (open && attachment && attachment.canPreview) {
      setLoading(true);
      setError(null);
      setBlobUrl(null);
      setTextContent(null);

      getQuotationAttachmentPreviewBlobRequest(quotationId, attachment.id)
        .then(async ({ blob, mimeType }) => {
          if (!active) return;
          if (mimeType.startsWith('text/plain')) {
            const text = await blob.text();
            if (active) setTextContent(text);
          } else {
            createdUrl = URL.createObjectURL(blob);
            if (active) setBlobUrl(createdUrl);
          }
        })
        .catch((err: unknown) => {
          const apiError = toApiError(err);
          if (active && !apiError.cancelled) setError(apiError.message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [open, quotationId, attachment]);

  const handleClose = () => {
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
    }
    setTextContent(null);
    setError(null);
    onClose();
  };

  const handleDownload = async () => {
    if (!attachment || downloading) return;
    try {
      setDownloading(true);
      const { blob, filename } = await downloadQuotationAttachmentBlobRequest(
        quotationId,
        attachment.id,
        attachment.originalFilename,
      );

      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (err: unknown) {
      const apiError = toApiError(err);
      if (onDownloadError && !apiError.cancelled) onDownloadError(apiError.message);
    } finally {
      setDownloading(false);
    }
  };

  if (!attachment) return null;

  const isImage = attachment.mimeType.startsWith('image/');
  const isPdf = attachment.mimeType === 'application/pdf';
  const isText = attachment.mimeType === 'text/plain';

  return (
    <AppDialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="md"
      fullScreen={fullScreen}
      showCloseButton
      closeButtonLabel="Close attachment preview"
      title={
        <Box>
          <Typography variant="h6" component="div" noWrap fontWeight={600}>
            {attachment.originalFilename}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {attachment.fileCategory} • {formatFileSize(attachment.fileSize)}
          </Typography>
        </Box>
      }
      titleProps={{ sx: { m: 0, p: 2, pr: 6 } }}
      contentDividers
      contentProps={{ sx: { p: 2, bgcolor: 'grey.50', display: 'flex', flexDirection: 'column', minHeight: 400 } }}
      actionsProps={{ sx: { p: 2, justifyContent: 'space-between' } }}
      actions={
        <>
          <Typography variant="caption" color="text.secondary">
            Uploaded: {new Date(attachment.uploadedAt).toLocaleDateString()}
          </Typography>
          <Stack direction="row" spacing={1}>
            <AppButton onClick={handleClose}>Close</AppButton>
            <AppButton
              variant="contained"
              startIcon={<DownloadOutlinedIcon />}
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? 'Downloading...' : 'Download'}
            </AppButton>
          </Stack>
        </>
      }
    >
        {!attachment.canPreview ? (
          <Box sx={{ my: 'auto', textAlign: 'center', p: 3 }}>
            <Alert severity="info" sx={{ maxWidth: 480, mx: 'auto', textAlign: 'left', mb: 2 }}>
              Inline preview is not available for {attachment.fileCategory} files ({attachment.mimeType}).
            </Alert>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Download the file to view it on your device.
            </Typography>
            <AppButton
              variant="contained"
              startIcon={<DownloadOutlinedIcon />}
              onClick={handleDownload}
              disabled={downloading}
              sx={{ mt: 1 }}
            >
              {downloading ? 'Downloading...' : 'Download File'}
            </AppButton>
          </Box>
        ) : loading ? (
          <Box sx={{ my: 'auto', textAlign: 'center', p: 4 }}>
            <InlineLoader size={40} label="Loading preview..." direction="column" />
          </Box>
        ) : error ? (
          <Box sx={{ my: 'auto' }}>
            <ServerErrorAlert message={error} />
          </Box>
        ) : isPdf && blobUrl ? (
          <Box
            component="iframe"
            src={blobUrl}
            title={`Preview of ${attachment.originalFilename}`}
            sx={{
              width: '100%',
              height: fullScreen ? 'calc(100vh - 160px)' : 500,
              border: 'none',
              borderRadius: 1,
              bgcolor: 'background.paper',
            }}
          />
        ) : isImage && blobUrl ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              minHeight: 350,
              overflow: 'hidden',
            }}
          >
            <Box
              component="img"
              src={blobUrl}
              alt={attachment.originalFilename}
              sx={{
                maxWidth: '100%',
                maxHeight: fullScreen ? 'calc(100vh - 160px)' : 480,
                objectFit: 'contain',
                borderRadius: 1,
                boxShadow: 1,
              }}
            />
          </Box>
        ) : isText && textContent !== null ? (
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              maxHeight: 500,
              overflowY: 'auto',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              bgcolor: 'background.paper',
            }}
          >
            {textContent}
          </Paper>
        ) : null}
    </AppDialog>
  );
}
