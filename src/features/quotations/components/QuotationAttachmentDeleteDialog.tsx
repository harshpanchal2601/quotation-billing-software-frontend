import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { toApiError } from '../../../services/apiClient';
import { deleteQuotationAttachmentRequest } from '../api/quotation-attachments.api';
import type { QuotationAttachment } from '../quotation-attachments.types';
import { quotationAttachmentsQueryKeys } from '../quotation-attachments.query-keys';
import { formatFileSize } from '../quotation-attachments.utils';

interface QuotationAttachmentDeleteDialogProps {
  open: boolean;
  quotationId: number;
  attachment: QuotationAttachment | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function QuotationAttachmentDeleteDialog({
  open,
  quotationId,
  attachment,
  onClose,
  onSuccess,
}: QuotationAttachmentDeleteDialogProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!attachment) throw new Error('No attachment selected');
      return deleteQuotationAttachmentRequest(quotationId, attachment.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationAttachmentsQueryKeys.list(quotationId) });
      onSuccess(`Deleted "${attachment?.originalFilename}" successfully`);
      handleClose();
    },
    onError: (error) => {
      const apiError = toApiError(error);
      if (!apiError.cancelled) setError(apiError.message);
    },
  });

  const handleClose = () => {
    if (deleteMutation.isPending) return;
    setError(null);
    onClose();
  };

  const handleConfirm = () => {
    if (attachment) {
      deleteMutation.mutate();
    }
  };

  if (!attachment) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      aria-labelledby="delete-attachment-dialog-title"
    >
      <DialogTitle id="delete-attachment-dialog-title">Delete Attachment?</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Typography variant="body2" gutterBottom>
          Are you sure you want to delete <strong>{attachment.originalFilename}</strong> ({attachment.fileCategory}, {formatFileSize(attachment.fileSize)})?
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
          This will remove the stored attachment file. The quotation itself, its financial totals, status, and generated PDFs will remain unchanged.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} autoFocus disabled={deleteMutation.isPending}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          color="error"
          variant="contained"
          loading={deleteMutation.isPending}
          loadingPosition="start"
        >
          {deleteMutation.isPending ? 'Deleting...' : 'Delete Attachment'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
