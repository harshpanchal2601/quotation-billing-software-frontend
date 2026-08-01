import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { toApiError } from '@shared/api/apiClient';
import { DeleteConfirmDialog } from '@shared/ui/dialogs';
import { ServerErrorAlert } from '@shared/ui/feedback';
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
    <DeleteConfirmDialog
      open={open}
      title="Delete Attachment?"
      confirmLabel={deleteMutation.isPending ? 'Deleting...' : 'Delete Attachment'}
      isDeleting={deleteMutation.isPending}
      onClose={handleClose}
      onConfirm={handleConfirm}
    >
      <Stack spacing={1}>
        <ServerErrorAlert message={error} />
        <Typography variant="body2" gutterBottom>
          Are you sure you want to delete <strong>{attachment.originalFilename}</strong> ({attachment.fileCategory}, {formatFileSize(attachment.fileSize)})?
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
          This will remove the stored attachment file. The quotation itself, its financial totals, status, and generated PDFs will remain unchanged.
        </Typography>
      </Stack>
    </DeleteConfirmDialog>
  );
}
