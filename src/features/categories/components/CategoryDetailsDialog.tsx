import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import { useQuery } from '@tanstack/react-query';

import { ErrorState } from '@shared/components/common/ErrorState';
import { toApiError } from '@shared/api/apiClient';
import { AppButton } from '@shared/ui/actions';
import { AppDialog } from '@shared/ui/dialogs';
import { AppStatusChip } from '@shared/ui/display';
import { DetailFields, DetailSection } from '@shared/ui/layout';
import { getCategoryRequest } from '../api/categories.api';
import { categoriesQueryKeys } from '../model/categories.query-keys';
import type { CategoryListItem } from '../model/categories.types';
import { isProtectedCategory } from '../model/categories.utils';

type CategoryDetailsDialogProps = {
  categoryId: number | null;
  onClose: () => void;
  onEdit?: (category: CategoryListItem) => void;
};

export function CategoryDetailsDialog({ categoryId, onClose, onEdit }: CategoryDetailsDialogProps) {
  const open = Boolean(categoryId);

  const query = useQuery({
    queryKey: categoriesQueryKeys.detail(categoryId ?? 0),
    queryFn: () => getCategoryRequest(categoryId!),
    enabled: open && categoryId !== null,
  });

  function formatDate(isoString: string) {
    return new Intl.DateTimeFormat('en-IN', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(isoString));
  }

  const category = query.data;
  const isProtected = category ? isProtectedCategory(category.slug) : false;

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title="Category Details"
      maxWidth="sm"
      fullWidth
      contentDividers
      actions={
        <>
          <AppButton onClick={onClose}>Close</AppButton>
          {category && onEdit ? (
            <AppButton
              variant="contained"
              onClick={() => {
                onClose();
                onEdit(category);
              }}
            >
              Edit Category
            </AppButton>
          ) : null}
        </>
      }
    >
      {query.isPending ? (
        <Stack spacing={2} py={1}>
          <Skeleton height={32} width="60%" />
          <Skeleton height={20} width="40%" />
          <Skeleton height={60} />
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

      {category ? (
        <DetailSection title={category.name} actions={<AppStatusChip label={category.isActive ? 'Active' : 'Inactive'} variant={category.isActive ? 'success' : 'neutral'} />}>
          {isProtected ? <Tooltip title="The default Uncategorised category is protected from deletion"><Chip icon={<LockOutlinedIcon />} label="Default category" size="small" variant="outlined" sx={{ alignSelf: 'flex-start' }} /></Tooltip> : null}
          <DetailFields fields={[
            { label: 'Category code', value: category.slug }, { label: 'Linked items', value: category.linkedItemCount },
            { label: 'Created', value: formatDate(category.createdAt) }, { label: 'Last updated', value: formatDate(category.updatedAt) },
          ]} />
          <DetailFields columns={1} fields={[{ label: 'Description', value: category.description || 'No description provided.' }]} />
        </DetailSection>
      ) : null}
    </AppDialog>
  );
}
