import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import { useQuery } from '@tanstack/react-query';

import { ErrorState } from '@shared/components/common/ErrorState';
import { toApiError } from '@shared/api/apiClient';
import { AppButton } from '@shared/ui/actions';
import { AppDialog } from '@shared/ui/dialogs';
import { AppStatusChip } from '@shared/ui/display';
import { DetailFields, DetailSection } from '@shared/ui/layout';
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
    <AppDialog
      open={open}
      onClose={onClose}
      title="Measurement Unit Details"
      maxWidth="sm"
      fullWidth
      contentDividers
      actions={
        <>
          <AppButton onClick={onClose}>Close</AppButton>
          {unit && onEdit ? (
            <AppButton
              variant="contained"
              onClick={() => {
                onClose();
                onEdit(unit);
              }}
            >
              Edit Unit
            </AppButton>
          ) : null}
        </>
      }
    >
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
          <AppButton variant="outlined" size="small" onClick={() => void query.refetch()}>
            Retry
          </AppButton>
        </Stack>
      ) : null}

      {unit ? (
        <DetailSection title={unit.name} actions={<AppStatusChip label={unit.isActive ? 'Active' : 'Inactive'} variant={unit.isActive ? 'success' : 'neutral'} />}>
          <DetailFields fields={[
            { label: 'Symbol', value: unit.symbol }, { label: 'Quantity type', value: formatQuantityTypeLabel(unit.allowDecimal) },
            { label: 'Linked items', value: unit.linkedItemCount },
            { label: 'Created', value: formatDate(unit.createdAt) }, { label: 'Last updated', value: formatDate(unit.updatedAt) },
          ]} />
        </DetailSection>
      ) : null}
    </AppDialog>
  );
}
