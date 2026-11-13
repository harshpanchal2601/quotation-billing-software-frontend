import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { SafeImage } from '@shared/components/common/SafeImage';
import { AppStatusChip } from '@shared/ui/display';
import { RecordTable, RowActionsMenu, type TableSorting } from '@shared/ui/tables';
import type { ItemListItem } from '../model/items.types';
import {
  formatCurrencyRate,
  formatGstRateLabel,
  formatItemSourceTypeLabel,
  formatReadableDate,
  resolveAssetUrl,
} from '../model/items.utils';

type ItemTableProps = {
  rowNumberStart?: number;
  items: ItemListItem[];
  sorting?: TableSorting;
  busyItemId?: number | null;
  onView: (item: ItemListItem) => void;
  onEdit: (item: ItemListItem) => void;
  onStatusChange: (item: ItemListItem) => void;
  onDelete: (item: ItemListItem) => void;
  canManage?: boolean;
};

export function ItemTable({
  rowNumberStart = 1,
  items,
  sorting,
  busyItemId = null,
  onView,
  onEdit,
  onStatusChange,
  onDelete,
  canManage = false,
}: ItemTableProps) {
  return (
    <RecordTable
      rows={items}
      rowKey={(item) => item.id}
      label="Items"
      rowNumberStart={rowNumberStart}
      sorting={sorting}
      showSortControls={false}
      columns={[
        { key: 'name', label: 'Item', sortKey: 'name', minWidth: 280, render: (item) => <Stack direction="row" spacing={1.5} alignItems="center"><Box sx={{ width: 40, height: 40, borderRadius: 1, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}><SafeImage src={resolveAssetUrl(item.imageUrl)} alt={item.name} fallbackLabel="No image" compact /></Box><Box minWidth={0}><Typography variant="body2" fontWeight={700}>{item.name}</Typography>{item.shortDescription ? <Typography variant="caption" color="text.secondary" display="block">{item.shortDescription}</Typography> : null}</Box></Stack> },
        { key: 'itemCode', label: 'Item code', sortKey: 'itemCode', render: (item) => <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{item.itemCode}</Typography> },
        { key: 'category', label: 'Category', minWidth: 160, render: (item) => item.category?.name ?? 'Uncategorised' },
        { key: 'unit', label: 'Unit', minWidth: 160, render: (item) => <Typography variant="body2"><strong style={{ fontFamily: 'monospace' }}>{item.measurementUnit.symbol}</strong> ({item.measurementUnit.name})</Typography> },
        { key: 'defaultRate', label: 'Default rate', sortKey: 'defaultRate', align: 'right', render: (item) => formatCurrencyRate(item.defaultRate) },
        { key: 'gstRate', label: 'GST', sortKey: 'gstRate', align: 'right', render: (item) => formatGstRateLabel(item.gstRate) },
        { key: 'source', label: 'Source', render: (item) => <Chip label={formatItemSourceTypeLabel(item.sourceType)} size="small" variant="outlined" /> },
        { key: 'quotationUsageCount', label: 'Quotations', align: 'right', render: (item) => item.quotationUsageCount },
        { key: 'status', label: 'Status', render: (item) => <AppStatusChip label={item.isActive ? 'Active' : 'Inactive'} variant={item.isActive ? 'success' : 'neutral'} size="small" /> },
        { key: 'updatedAt', label: 'Updated', sortKey: 'updatedAt', noWrap: true, render: (item) => formatReadableDate(item.updatedAt) },
        { key: 'actions', label: 'Actions', align: 'right', render: renderActionMenu },
      ]}
    />
  );

  function renderActionMenu(item: ItemListItem) {
    return (
      <RowActionsMenu
        triggerLabel={`Actions for ${item.name}`}
        disabled={busyItemId === item.id}
        actions={[
          { key: 'view', label: 'View Details', onSelect: () => onView(item) },
          ...(canManage ? [
            { key: 'edit', label: 'Edit Item', onSelect: () => onEdit(item) },
            { key: 'status', label: item.isActive ? 'Deactivate' : 'Activate', onSelect: () => onStatusChange(item) },
            { key: 'delete', label: 'Delete Item', destructive: true, onSelect: () => onDelete(item) },
          ] : []),
        ]}
      />
    );
  }
}
