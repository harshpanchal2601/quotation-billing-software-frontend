import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { ConfirmDialog, DeleteConfirmDialog } from '@shared/ui/dialogs';
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
    <ConfirmDialog
      open={Boolean(item)}
      title={isDeactivating ? 'Deactivate Item' : 'Activate Item'}
      confirmLabel={isDeactivating ? 'Deactivate' : 'Activate'}
      confirmColor={isDeactivating ? 'warning' : 'primary'}
      isConfirming={isSubmitting}
      onClose={onClose}
      onConfirm={onConfirm}
    >
      <Stack spacing={2} pt={1}>
        <Typography color="text.secondary">
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
        </Typography>
      </Stack>
    </ConfirmDialog>
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
    <DeleteConfirmDialog
      open={Boolean(item)}
      title="Delete Item"
      confirmLabel="Delete Item"
      isDeleting={isDeleting}
      onClose={onClose}
      onConfirm={onConfirm}
    >
      <Stack spacing={2} pt={1}>
        {hasQuotations ? (
          <Alert severity="info">
            This item is referenced in <strong>{item.quotationUsageCount}</strong> quotation line item(s).
            Historical quotation snapshots will remain valid and unchanged.
          </Alert>
        ) : null}

        <Typography color="text.secondary">
          Are you sure you want to delete <strong>{item.name}</strong> (code: {item.itemCode})?
        </Typography>

        <Typography variant="body2" color="text.secondary">
          Note: Deletion is a soft deletion. This item will no longer appear in normal item lists or dropdowns.
        </Typography>
      </Stack>
    </DeleteConfirmDialog>
  );
}
