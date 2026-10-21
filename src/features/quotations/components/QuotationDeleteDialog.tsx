import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { DeleteConfirmDialog } from '@shared/ui/dialogs';
import { formatCurrency } from '../model/quotations.utils';

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
    <DeleteConfirmDialog
      open={open}
      title="Delete Draft Quotation"
      confirmLabel={isSubmitting ? 'Deleting...' : 'Delete Quotation'}
      isDeleting={isSubmitting}
      onClose={onClose}
      onConfirm={onConfirm}
    >
      <Stack spacing={2} pt={1}>
        <Typography color="text.secondary">
          Are you sure you want to delete quotation <strong>{quotationNumber}</strong> for <strong>{customerName}</strong> ({formatCurrency(grandTotal, currency)})?
        </Typography>
        <Typography variant="body2" color="text.secondary">
          • Only draft quotations can be deleted.<br />
          • Soft deletion will remove this quotation from active views.<br />
          • Quotation number <strong>{quotationNumber}</strong> will remain reserved for audit integrity.
        </Typography>
      </Stack>
    </DeleteConfirmDialog>
  );
}
