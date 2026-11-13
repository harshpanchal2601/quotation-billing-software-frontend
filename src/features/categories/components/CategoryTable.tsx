import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { RecordTable, RowActionsMenu, type TableSorting } from '@shared/ui/tables';
import { AppStatusChip } from '@shared/ui/display';
import type { CategoryListItem } from '../model/categories.types';
import { isProtectedCategory } from '../model/categories.utils';

type CategoryTableProps = {
  rowNumberStart?: number;
  categories: CategoryListItem[];
  sorting?: TableSorting;
  busyCategoryId?: number | null;
  onView: (category: CategoryListItem) => void;
  onEdit: (category: CategoryListItem) => void;
  onStatusChange: (category: CategoryListItem) => void;
  onDelete: (category: CategoryListItem) => void;
  canManage?: boolean;
};

export function CategoryTable({
  rowNumberStart = 1,
  categories,
  sorting,
  busyCategoryId = null,
  onView,
  onEdit,
  onStatusChange,
  onDelete,
  canManage = false,
}: CategoryTableProps) {
  function formatDate(isoString: string) {
    return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(isoString));
  }

  function renderRowActions(category: CategoryListItem) {
    const isProtected = isProtectedCategory(category.slug);

    return (
      <RowActionsMenu
        triggerLabel={`Actions for ${category.name}`}
        disabled={busyCategoryId === category.id}
        actions={[
          { key: 'view', label: 'View Details', onSelect: () => onView(category) },
          ...(canManage ? [{ key: 'edit', label: 'Edit Category', onSelect: () => onEdit(category) },
          {
            key: 'status',
            label: category.isActive ? 'Deactivate' : 'Activate',
            disabled: isProtected && category.isActive,
            onSelect: () => onStatusChange(category),
          },
          {
            key: 'delete',
            label: 'Delete Category',
            disabled: isProtected,
            destructive: true,
            onSelect: () => onDelete(category),
          }] : []),
        ]}
      />
    );
  }

  return (
    <RecordTable
      rows={categories}
      rowKey={(category) => category.id}
      label="Categories"
      rowNumberStart={rowNumberStart}
      sorting={sorting}
      showSortControls={false}
      columns={[
        { key: 'name', label: 'Category', sortKey: 'name', render: (category) => <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap><Typography variant="body2" fontWeight={700}>{category.name}</Typography>{isProtectedCategory(category.slug) ? <Tooltip title="Default Uncategorised category cannot be deactivated or deleted"><Chip icon={<LockOutlinedIcon />} label="System" size="small" variant="outlined" /></Tooltip> : null}</Stack> },
        { key: 'slug', label: 'Category code', sortKey: 'slug', render: (category) => category.slug },
        { key: 'description', label: 'Description', render: (category) => category.description || '—' },
        { key: 'linkedItemCount', label: 'Linked items', align: 'right', render: (category) => category.linkedItemCount },
        { key: 'status', label: 'Status', render: (category) => <AppStatusChip label={category.isActive ? 'Active' : 'Inactive'} variant={category.isActive ? 'success' : 'neutral'} size="small" /> },
        { key: 'updatedAt', label: 'Updated', sortKey: 'updatedAt', noWrap: true, render: (category) => formatDate(category.updatedAt) },
        { key: 'actions', label: 'Actions', align: 'right', render: renderRowActions },
      ]}
    />
  );
}
