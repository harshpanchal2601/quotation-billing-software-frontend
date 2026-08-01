import Alert from '@mui/material/Alert';
import DialogContentText from '@mui/material/DialogContentText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { ConfirmDialog, DeleteConfirmDialog } from '@shared/ui/dialogs';
import type { MeasurementUnitListItem } from '../model/measurement-units.types';

type StatusDialogProps = {
  unit: MeasurementUnitListItem | null;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function MeasurementUnitStatusDialog({ unit, isSubmitting, onClose, onConfirm }: StatusDialogProps) {
  if (!unit) return null;
  const isDeactivating = unit.isActive;

  return (
    <ConfirmDialog
      open={Boolean(unit)}
      title={isDeactivating ? 'Deactivate Measurement Unit' : 'Activate Measurement Unit'}
      confirmLabel={isDeactivating ? 'Deactivate' : 'Activate'}
      confirmColor={isDeactivating ? 'warning' : 'primary'}
      isConfirming={isSubmitting}
      onClose={onClose}
      onConfirm={onConfirm}
    >
      <Stack spacing={2} pt={1}>
        <DialogContentText>
          {isDeactivating ? (
            <>
              Are you sure you want to deactivate <strong>{unit.name}</strong> ({unit.symbol})?
              <br />
              <br />
              Existing items will retain this unit, but inactive units cannot be selected for future item creation or updates.
            </>
          ) : (
            <>
              Are you sure you want to activate <strong>{unit.name}</strong> ({unit.symbol})? It will become available for item assignment.
            </>
          )}
        </DialogContentText>
      </Stack>
    </ConfirmDialog>
  );
}

type DeleteDialogProps = {
  unit: MeasurementUnitListItem | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function MeasurementUnitDeleteDialog({ unit, isDeleting, onClose, onConfirm }: DeleteDialogProps) {
  if (!unit) return null;
  const hasLinkedItems = unit.linkedItemCount > 0;

  return (
    <DeleteConfirmDialog
      open={Boolean(unit)}
      title="Delete Measurement Unit"
      confirmLabel="Delete Unit"
      confirmDisabled={hasLinkedItems}
      isDeleting={isDeleting}
      onClose={onClose}
      onConfirm={onConfirm}
    >
      <Stack spacing={2} pt={1}>
        {hasLinkedItems ? (
          <Alert severity="warning">
            This unit cannot be deleted because <strong>{unit.linkedItemCount}</strong> item(s) are linked to it.
          </Alert>
        ) : null}

        <DialogContentText>
          Are you sure you want to delete <strong>{unit.name}</strong> (symbol: {unit.symbol})?
        </DialogContentText>

        <Typography variant="body2" color="text.secondary">
          Note: Deletion is a soft deletion. Deleted measurement units will no longer appear in normal unit lists.
        </Typography>
      </Stack>
    </DeleteConfirmDialog>
  );
}
