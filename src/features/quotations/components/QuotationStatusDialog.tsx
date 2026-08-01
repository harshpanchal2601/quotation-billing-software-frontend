import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { AppButton } from '@shared/ui/actions';
import { AppDialog } from '@shared/ui/dialogs';
import type { QuotationStatus } from '../model/quotations.types';
import { formatQuotationStatusLabel, getValidNextStatuses } from '../model/quotations.utils';

type QuotationStatusDialogProps = {
  open: boolean;
  quotationNumber: string;
  currentStatus: QuotationStatus;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: (targetStatus: QuotationStatus, comment?: string) => void;
};

export function QuotationStatusDialog({
  open,
  quotationNumber,
  currentStatus,
  isSubmitting = false,
  onClose,
  onConfirm,
}: QuotationStatusDialogProps) {
  const allowedNext = getValidNextStatuses(currentStatus);
  const [targetStatus, setTargetStatus] = useState<QuotationStatus | ''>(
    allowedNext.length > 0 ? allowedNext[0]! : '',
  );
  const [comment, setComment] = useState('');

  const handleConfirm = () => {
    if (!targetStatus || isSubmitting) return;
    onConfirm(targetStatus, comment.trim() || undefined);
  };

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      preventClose={isSubmitting}
      fullWidth
      maxWidth="xs"
      title="Update Quotation Status"
      contentProps={{ sx: { pt: 1 } }}
      actionsProps={{ sx: { px: 3, pb: 2 } }}
      actions={
        <>
          <AppButton onClick={onClose} color="inherit" disabled={isSubmitting}>
            Cancel
          </AppButton>
          <AppButton
            onClick={handleConfirm}
            variant="contained"
            color="primary"
            disabled={!targetStatus || allowedNext.length === 0}
            isLoading={isSubmitting}
            loadingPosition="start"
          >
            {isSubmitting ? 'Updating...' : 'Update Status'}
          </AppButton>
        </>
      }
    >
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Change status for quotation <strong>{quotationNumber}</strong> (Current: {formatQuotationStatusLabel(currentStatus)}).
        </Typography>
        {allowedNext.length === 0 ? (
          <Typography color="error">
            This quotation is in a terminal status ({formatQuotationStatusLabel(currentStatus)}) and cannot transition to any other status.
          </Typography>
        ) : (
          <>
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel id="target-status-select-label">New Status</InputLabel>
              <Select
                labelId="target-status-select-label"
                value={targetStatus}
                label="New Status"
                onChange={(e) => setTargetStatus(e.target.value as QuotationStatus)}
                disabled={isSubmitting}
              >
                {allowedNext.map((st) => (
                  <MenuItem key={st} value={st}>
                    {formatQuotationStatusLabel(st)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Status Change Note (Optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              multiline
              rows={3}
              fullWidth
              size="small"
              placeholder="Add an optional comment describing why the status is changing..."
              disabled={isSubmitting}
            />
          </>
        )}
    </AppDialog>
  );
}
