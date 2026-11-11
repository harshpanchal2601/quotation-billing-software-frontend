import Chip from '@mui/material/Chip';

import { RecordTable, RowActionsMenu, type TableSorting } from '@shared/ui/tables';
import { AppStatusChip } from '@shared/ui/display';
import type { MeasurementUnitListItem } from '../model/measurement-units.types';
import { formatQuantityTypeLabel } from '../model/measurement-units.utils';

type MeasurementUnitTableProps = {
  rowNumberStart?: number;
  units: MeasurementUnitListItem[];
  sorting?: TableSorting;
  busyUnitId?: number | null;
  onView: (unit: MeasurementUnitListItem) => void;
  onEdit: (unit: MeasurementUnitListItem) => void;
  onStatusChange: (unit: MeasurementUnitListItem) => void;
  onDelete: (unit: MeasurementUnitListItem) => void;
  canManage?: boolean;
};

export function MeasurementUnitTable({
  rowNumberStart = 1,
  units,
  sorting,
  busyUnitId = null,
  onView,
  onEdit,
  onStatusChange,
  onDelete,
  canManage = false,
}: MeasurementUnitTableProps) {
  function formatDate(isoString: string) {
    return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(isoString));
  }

  function renderRowActions(unit: MeasurementUnitListItem) {
    return (
      <RowActionsMenu
        triggerLabel={`Actions for ${unit.name}`}
        disabled={busyUnitId === unit.id}
        actions={[
          { key: 'view', label: 'View Details', onSelect: () => onView(unit) },
          ...(canManage ? [{ key: 'edit', label: 'Edit Unit', onSelect: () => onEdit(unit) },
          {
            key: 'status',
            label: unit.isActive ? 'Deactivate' : 'Activate',
            onSelect: () => onStatusChange(unit),
          },
          {
            key: 'delete',
            label: 'Delete Unit',
            destructive: true,
            onSelect: () => onDelete(unit),
          }] : []),
        ]}
      />
    );
  }

  return (
    <RecordTable
      rows={units}
      rowKey={(unit) => unit.id}
      label="Measurement units"
      rowNumberStart={rowNumberStart}
      sorting={sorting}
      showSortControls={false}
      columns={[
        { key: 'name', label: 'Unit name', sortKey: 'name', render: (unit) => unit.name },
        { key: 'symbol', label: 'Symbol', sortKey: 'symbol', render: (unit) => <Chip label={unit.symbol} size="small" variant="outlined" sx={{ fontWeight: 600, fontFamily: 'monospace' }} /> },
        { key: 'quantityType', label: 'Quantity type', render: (unit) => formatQuantityTypeLabel(unit.allowDecimal) },
        { key: 'linkedItemCount', label: 'Linked items', align: 'right', render: (unit) => unit.linkedItemCount },
        { key: 'status', label: 'Status', render: (unit) => <AppStatusChip label={unit.isActive ? 'Active' : 'Inactive'} variant={unit.isActive ? 'success' : 'neutral'} size="small" /> },
        { key: 'updatedAt', label: 'Updated', sortKey: 'updatedAt', noWrap: true, render: (unit) => formatDate(unit.updatedAt) },
        { key: 'actions', label: 'Actions', align: 'right', render: renderRowActions },
      ]}
    />
  );
}
