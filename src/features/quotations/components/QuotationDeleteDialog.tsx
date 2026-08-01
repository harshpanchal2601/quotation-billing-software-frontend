import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';

import { AppButton } from '@shared/ui/actions';
import { formatCurrency } from '../quotations.utils';

type QuotationDeleteDialogProps = {
  open: boolean;
  quotationNumber: string;
  customerName: string;
  grandTotal: string;
  currency?: string;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function QuotationDeleteDialog({
  open,
  quotationNumber,
  customerName,
  grandTotal,
  currency = 'INR',
  isSubmitting = false,
  onClose,
  onConfirm,
}: QuotationDeleteDialogProps) {
  return (
    <Dialog open={open} onClose={() => (!isSubmitting ? onClose() : undefined)} fullWidth maxWidth="xs">
      <DialogTitle color="error.main">Delete Draft Quotation</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <DialogContentText sx={{ mb: 2 }}>
          Are you sure you want to delete quotation <strong>{quotationNumber}</strong> for <strong>{customerName}</strong> ({formatCurrency(grandTotal, currency)})?
        </DialogContentText>
        <Typography variant="body2" color="text.secondary">
          • Only draft quotations can be deleted.<br />
          • Soft deletion will remove this quotation from active views.<br />
          • Quotation number <strong>{quotationNumber}</strong> will remain reserved for audit integrity.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <AppButton onClick={onClose} color="inherit" disabled={isSubmitting}>
          Cancel
        </AppButton>
        <AppButton onClick={onConfirm} variant="contained" color="error" isLoading={isSubmitting} loadingPosition="start">
          {isSubmitting ? 'Deleting...' : 'Delete Quotation'}
        </AppButton>
      </DialogActions>
    </Dialog>
  );
}
