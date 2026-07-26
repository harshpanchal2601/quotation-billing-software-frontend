import CloseIcon from '@mui/icons-material/Close';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useEffect, useState } from 'react';

import {
  downloadQuotationAttachmentBlobRequest,
  getQuotationAttachmentPreviewBlobRequest,
} from '../api/quotation-attachments.api';
import { toApiError } from '../../../services/apiClient';
import type { QuotationAttachment } from '../quotation-attachments.types';
import { formatFileSize } from '../quotation-attachments.utils';

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
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="md"
      fullScreen={fullScreen}
      aria-labelledby="attachment-preview-dialog-title"
    >
      <DialogTitle id="attachment-preview-dialog-title" sx={{ m: 0, p: 2, pr: 6 }}>
        <Typography variant="h6" component="div" noWrap fontWeight={600}>
          {attachment.originalFilename}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {attachment.fileCategory} • {formatFileSize(attachment.fileSize)}
        </Typography>
        <IconButton
          aria-label="Close attachment preview"
          onClick={handleClose}
          sx={{ position: 'absolute', right: 8, top: 8, color: 'grey.500' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 2, bgcolor: 'grey.50', display: 'flex', flexDirection: 'column', minHeight: 400 }}>
        {!attachment.canPreview ? (
          <Box sx={{ my: 'auto', textAlign: 'center', p: 3 }}>
            <Alert severity="info" sx={{ maxWidth: 480, mx: 'auto', textAlign: 'left', mb: 2 }}>
              Inline preview is not available for {attachment.fileCategory} files ({attachment.mimeType}).
            </Alert>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Download the file to view it on your device.
            </Typography>
            <Button
              variant="contained"
              startIcon={<DownloadOutlinedIcon />}
              onClick={handleDownload}
              disabled={downloading}
              sx={{ mt: 1 }}
            >
              {downloading ? 'Downloading...' : 'Download File'}
            </Button>
          </Box>
        ) : loading ? (
          <Box sx={{ my: 'auto', textAlign: 'center', p: 4 }}>
            <CircularProgress size={40} sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              Loading preview...
            </Typography>
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ my: 'auto' }}>
            {error}
          </Alert>
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
      </DialogContent>

      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
        <Typography variant="caption" color="text.secondary">
          Uploaded: {new Date(attachment.uploadedAt).toLocaleDateString()}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button onClick={handleClose}>Close</Button>
          <Button
            variant="contained"
            startIcon={<DownloadOutlinedIcon />}
            onClick={handleDownload}
            disabled={downloading}
          >
            {downloading ? 'Downloading...' : 'Download'}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
