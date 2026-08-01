import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

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
    <Dialog open={Boolean(unit)} onClose={isSubmitting ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{isDeactivating ? 'Deactivate Measurement Unit' : 'Activate Measurement Unit'}</DialogTitle>
      <DialogContent>
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
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color={isDeactivating ? 'warning' : 'primary'}
          loading={isSubmitting}
        >
          {isDeactivating ? 'Deactivate' : 'Activate'}
        </Button>
      </DialogActions>
    </Dialog>
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
    <Dialog open={Boolean(unit)} onClose={isDeleting ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Delete Measurement Unit</DialogTitle>
      <DialogContent>
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
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isDeleting}>
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color="error"
          loading={isDeleting}
          disabled={hasLinkedItems}
        >
          Delete Unit
        </Button>
      </DialogActions>
    </Dialog>
  );
}
