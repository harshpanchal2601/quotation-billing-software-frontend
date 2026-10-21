import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';

import { ErrorState } from '@shared/components/common/ErrorState';
import { toApiError } from '@shared/api/apiClient';
import { AppButton } from '@shared/ui/actions';
import { AppDialog } from '@shared/ui/dialogs';
import { AppStatusChip } from '@shared/ui/display';
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
        <Stack spacing={2.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Stack spacing={0.5}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="h5" fontWeight={700}>
                  {category.name}
                </Typography>
                {isProtected ? (
                  <Tooltip title="Default Uncategorised category is system protected">
                    <Chip
                      icon={<LockOutlinedIcon sx={{ fontSize: '14px !important' }} />}
                      label="System Protected"
                      size="small"
                      color="default"
                      variant="outlined"
                    />
                  </Tooltip>
                ) : null}
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Slug: {category.slug}
              </Typography>
            </Stack>

            <AppStatusChip
              label={category.isActive ? 'Active' : 'Inactive'}
              variant={category.isActive ? 'success' : 'neutral'}
            />
          </Stack>

          <Divider />

          <Stack spacing={1}>
            <Typography variant="subtitle2" color="text.secondary">
              Description
            </Typography>
            <Typography variant="body1">
              {category.description || 'No description provided.'}
            </Typography>
          </Stack>

          <Divider />

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              Linked Items
            </Typography>
            <Typography variant="body1" fontWeight={700}>
              {category.linkedItemCount} non-deleted item(s)
            </Typography>
          </Stack>

          <Divider />

          <Stack spacing={1}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary">
                Created Date
              </Typography>
              <Typography variant="caption">{formatDate(category.createdAt)}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary">
                Last Updated
              </Typography>
              <Typography variant="caption">{formatDate(category.updatedAt)}</Typography>
            </Stack>
          </Stack>
        </Stack>
      ) : null}
    </AppDialog>
  );
}
