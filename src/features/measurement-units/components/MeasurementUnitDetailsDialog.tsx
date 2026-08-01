import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';

import { ErrorState } from '@shared/components/common/ErrorState';
import { toApiError } from '@shared/api/apiClient';
import { getMeasurementUnitRequest } from '../api/measurement-units.api';
import { measurementUnitsQueryKeys } from '../model/measurement-units.query-keys';
import type { MeasurementUnitListItem } from '../model/measurement-units.types';
import { formatQuantityTypeLabel } from '../model/measurement-units.utils';

type DetailsDialogProps = {
  unitId: number | null;
  onClose: () => void;
  onEdit?: (unit: MeasurementUnitListItem) => void;
};

export function MeasurementUnitDetailsDialog({ unitId, onClose, onEdit }: DetailsDialogProps) {
  const open = Boolean(unitId);

  const query = useQuery({
    queryKey: measurementUnitsQueryKeys.detail(unitId ?? 0),
    queryFn: () => getMeasurementUnitRequest(unitId!),
    enabled: open && unitId !== null,
  });

  function formatDate(isoString: string) {
    return new Intl.DateTimeFormat('en-IN', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(isoString));
  }

  const unit = query.data;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Measurement Unit Details</DialogTitle>
      <DialogContent dividers>
        {query.isPending ? (
          <Stack spacing={2} py={1}>
            <Skeleton height={32} width="60%" />
            <Skeleton height={20} width="40%" />
            <Skeleton height={40} />
            <Skeleton height={24} width="30%" />
          </Stack>
        ) : null}

        {query.isError ? (
          <Stack spacing={2} py={2}>
            <ErrorState message={toApiError(query.error).message} />
            <Button variant="outlined" size="small" onClick={() => void query.refetch()}>
              Retry
            </Button>
          </Stack>
        ) : null}

        {unit ? (
          <Stack spacing={2.5}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Stack spacing={0.5}>
                <Typography variant="h5" fontWeight={700}>
                  {unit.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Symbol: <strong style={{ fontFamily: 'monospace' }}>{unit.symbol}</strong>
                </Typography>
              </Stack>

              <Chip
                label={unit.isActive ? 'Active' : 'Inactive'}
                color={unit.isActive ? 'success' : 'default'}
              />
            </Stack>

            <Divider />

            <Stack spacing={1}>
              <Typography variant="subtitle2" color="text.secondary">
                Quantity Type Behaviour
              </Typography>
              <Typography variant="body1">
                {formatQuantityTypeLabel(unit.allowDecimal)}
              </Typography>
            </Stack>

            <Divider />

            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary">
                Linked Items
              </Typography>
              <Typography variant="body1" fontWeight={700}>
                {unit.linkedItemCount} non-deleted item(s)
              </Typography>
            </Stack>

            <Divider />

            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">
                  Created Date
                </Typography>
                <Typography variant="caption">{formatDate(unit.createdAt)}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">
                  Last Updated
                </Typography>
                <Typography variant="caption">{formatDate(unit.updatedAt)}</Typography>
              </Stack>
            </Stack>
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Close</Button>
        {unit && onEdit ? (
          <Button
            variant="contained"
            onClick={() => {
              onClose();
              onEdit(unit);
            }}
          >
            Edit Unit
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}
