import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { AppButton } from '@shared/ui/actions';
import type { ItemListItem } from '../items.types';

type StatusDialogProps = {
  item: ItemListItem | null;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function ItemStatusDialog({ item, isSubmitting, onClose, onConfirm }: StatusDialogProps) {
  if (!item) return null;
  const isDeactivating = item.isActive;

  return (
    <Dialog open={Boolean(item)} onClose={isSubmitting ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{isDeactivating ? 'Deactivate Item' : 'Activate Item'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} pt={1}>
          <DialogContentText>
            {isDeactivating ? (
              <>
                Are you sure you want to deactivate <strong>{item.name}</strong> ({item.itemCode})?
                <br />
                <br />
                Inactive items remain in historical quotations, but cannot be selected for future quotation creation.
              </>
            ) : (
              <>
                Are you sure you want to activate <strong>{item.name}</strong> ({item.itemCode})?
                <br />
                <br />
                An active product category and measurement unit are required to activate this item.
              </>
            )}
          </DialogContentText>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <AppButton onClick={onClose} disabled={isSubmitting}>
          Cancel
        </AppButton>
        <AppButton
          onClick={onConfirm}
          variant="contained"
          color={isDeactivating ? 'warning' : 'primary'}
          isLoading={isSubmitting}
        >
          {isDeactivating ? 'Deactivate' : 'Activate'}
        </AppButton>
      </DialogActions>
    </Dialog>
  );
}

type DeleteDialogProps = {
  item: ItemListItem | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function ItemDeleteDialog({ item, isDeleting, onClose, onConfirm }: DeleteDialogProps) {
  if (!item) return null;
  const hasQuotations = item.quotationUsageCount > 0;

  return (
    <Dialog open={Boolean(item)} onClose={isDeleting ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Delete Item</DialogTitle>
      <DialogContent>
        <Stack spacing={2} pt={1}>
          {hasQuotations ? (
            <Alert severity="info">
              This item is referenced in <strong>{item.quotationUsageCount}</strong> quotation line item(s).
              Historical quotation snapshots will remain valid and unchanged.
            </Alert>
          ) : null}

          <DialogContentText>
            Are you sure you want to delete <strong>{item.name}</strong> (code: {item.itemCode})?
          </DialogContentText>

          <Typography variant="body2" color="text.secondary">
            Note: Deletion is a soft deletion. This item will no longer appear in normal item lists or dropdowns.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <AppButton onClick={onClose} disabled={isDeleting}>
          Cancel
        </AppButton>
        <AppButton
          onClick={onConfirm}
          variant="contained"
          color="error"
          isLoading={isDeleting}
        >
          Delete Item
        </AppButton>
      </DialogActions>
    </Dialog>
  );
}
