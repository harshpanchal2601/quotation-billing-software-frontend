import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import { useState } from 'react';

import type { QuotationStatus } from '../quotations.types';
import { formatQuotationStatusLabel, getValidNextStatuses } from '../quotations.utils';

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
    <Dialog open={open} onClose={() => (!isSubmitting ? onClose() : undefined)} fullWidth maxWidth="xs">
      <DialogTitle>Update Quotation Status</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <DialogContentText sx={{ mb: 2 }}>
          Change status for quotation <strong>{quotationNumber}</strong> (Current: {formatQuotationStatusLabel(currentStatus)}).
        </DialogContentText>
        {allowedNext.length === 0 ? (
          <DialogContentText color="error">
            This quotation is in a terminal status ({formatQuotationStatusLabel(currentStatus)}) and cannot transition to any other status.
          </DialogContentText>
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
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="primary"
          disabled={!targetStatus || allowedNext.length === 0}
          loading={isSubmitting}
          loadingPosition="start"
        >
          {isSubmitting ? 'Updating...' : 'Update Status'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
