import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import TablePagination from '@mui/material/TablePagination';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { EmptyState } from '../../../components/common/EmptyState';
import { ErrorState } from '../../../components/common/ErrorState';
import { RefreshIndicator } from '../../../components/common/RefreshIndicator';
import { toApiError } from '../../../services/apiClient';
import {
  deleteCategoryRequest,
  listCategoriesRequest,
  updateCategoryStatusRequest,
} from '../api/categories.api';
import { categoriesQueryKeys } from '../categories.query-keys';
import type { CategoryListItem, CategoryListParams } from '../categories.types';
import { CategoryDeleteDialog, CategoryStatusDialog } from '../components/CategoryConfirmDialogs';
import { CategoryDetailsDialog } from '../components/CategoryDetailsDialog';
import { CategoryFormDialog } from '../components/CategoryFormDialog';
import { CategoryTable } from '../components/CategoryTable';

const sortOptions = [
  { value: 'name:asc', label: 'Name A–Z' },
  { value: 'name:desc', label: 'Name Z–A' },
  { value: 'slug:asc', label: 'Slug A–Z' },
  { value: 'slug:desc', label: 'Slug Z–A' },
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'createdAt:asc', label: 'Oldest first' },
  { value: 'updatedAt:desc', label: 'Recently updated' },
] as const;

export function CategoriesPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '');

  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryListItem | null>(null);
  const [detailsCategoryId, setDetailsCategoryId] = useState<number | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<CategoryListItem | null>(null);
  const [statusTarget, setStatusTarget] = useState<CategoryListItem | null>(null);

  const [pageError, setPageError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const params = parseCategoryListParams(searchParams);

  useEffect(() => setSearchInput(searchParams.get('search') ?? ''), [searchParams]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      updateSearchParams(setSearchParams, { search: searchInput.trim() || undefined, page: 1 });
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [searchInput, setSearchParams]);

  const query = useQuery({
    queryKey: categoriesQueryKeys.list(params),
    queryFn: () => listCategoriesRequest(params),
    placeholderData: keepPreviousData,
  });

  const statusMutation = useMutation({
    mutationFn: (category: CategoryListItem) =>
      updateCategoryStatusRequest(category.id, !category.isActive),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: categoriesQueryKeys.all });
      setStatusTarget(null);
      setSuccessMessage('Category status updated.');
    },
    onError: (error) => setPageError(toApiError(error).message),
  });

  const deleteMutation = useMutation({
    mutationFn: (category: CategoryListItem) => deleteCategoryRequest(category.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: categoriesQueryKeys.all });
      setDeleteTarget(null);
      setSuccessMessage('Category deleted.');
    },
    onError: (error) => setPageError(toApiError(error).message),
  });

  const sortValue = `${params.sortBy}:${params.sortOrder}`;
  const isFiltered = Boolean(params.search || params.isActive !== undefined);
  const busyCategoryId = statusMutation.isPending
    ? statusMutation.variables?.id
    : deleteMutation.isPending
      ? deleteMutation.variables?.id
      : null;
  const showRefreshing = query.isFetching && !query.isPending;

  function handleOpenCreate() {
    setEditingCategory(null);
    setFormOpen(true);
  }

  function handleOpenEdit(category: CategoryListItem) {
    setEditingCategory(category);
    setFormOpen(true);
  }

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ sm: 'center' }}>
        <Box>
          <Typography component="h1" variant="h1">
            Categories
          </Typography>
          <Typography color="text.secondary">
            Manage product categories for organizing items in quotations.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddOutlinedIcon />} onClick={handleOpenCreate}>
          Add Category
        </Button>
      </Stack>

      {pageError ? <Alert severity="error" onClose={() => setPageError(null)}>{pageError}</Alert> : null}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField
          label="Search categories"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search by name, slug or description"
          fullWidth
        />

        <TextField
          select
          label="Status"
          value={params.isActive === undefined ? 'all' : String(params.isActive)}
          onChange={(event) =>
            updateSearchParams(setSearchParams, {
              isActive: event.target.value === 'all' ? undefined : event.target.value === 'true',
              page: 1,
            })
          }
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="true">Active</MenuItem>
          <MenuItem value="false">Inactive</MenuItem>
        </TextField>

        <TextField
          select
          label="Sort"
          value={sortValue}
          onChange={(event) => {
            const [sortBy, sortOrder] = event.target.value.split(':') as [
              CategoryListParams['sortBy'],
              CategoryListParams['sortOrder'],
            ];
            updateSearchParams(setSearchParams, { sortBy, sortOrder, page: 1 });
          }}
          sx={{ minWidth: 200 }}
        >
          {sortOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <RefreshIndicator show={showRefreshing} />
      <Box aria-busy={query.isPending || showRefreshing}>
      {query.isPending ? (
        <Stack spacing={1}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} height={64} />
          ))}
        </Stack>
      ) : null}

      {query.isError ? (
        <Stack spacing={1}>
          <ErrorState message={toApiError(query.error).message} />
          <Button variant="outlined" sx={{ alignSelf: 'flex-start' }} onClick={() => void query.refetch()}>
            Retry
          </Button>
        </Stack>
      ) : null}

      {query.data && query.data.categories.length === 0 ? (
        <EmptyState
          title={isFiltered ? 'No categories match the filters' : 'No categories created yet'}
          description={
            isFiltered
              ? 'Adjust search or active status filters to view categories.'
              : 'Add a product category to start grouping quotation items.'
          }
        />
      ) : null}

      {query.data && query.data.categories.length > 0 ? (
        <>
          <Typography color="text.secondary">
            {query.data.pagination.total} category(ies) found
          </Typography>

          <CategoryTable
            categories={query.data.categories}
            busyCategoryId={busyCategoryId}
            onView={(cat) => setDetailsCategoryId(cat.id)}
            onEdit={handleOpenEdit}
            onStatusChange={(cat) => setStatusTarget(cat)}
            onDelete={(cat) => setDeleteTarget(cat)}
          />

          <TablePagination
            component="div"
            count={query.data.pagination.total}
            page={params.page - 1}
            rowsPerPage={params.limit}
            rowsPerPageOptions={[10, 20, 50]}
            onPageChange={(_event, nextPage) => updateSearchParams(setSearchParams, { page: nextPage + 1 })}
            onRowsPerPageChange={(event) =>
              updateSearchParams(setSearchParams, { limit: Number(event.target.value), page: 1 })
            }
          />
        </>
      ) : null}
      </Box>

      <CategoryFormDialog
        open={formOpen}
        category={editingCategory}
        onClose={() => setFormOpen(false)}
        onSuccess={(msg) => setSuccessMessage(msg)}
      />

      <CategoryDetailsDialog
        categoryId={detailsCategoryId}
        onClose={() => setDetailsCategoryId(null)}
        onEdit={(cat) => handleOpenEdit(cat)}
      />

      <CategoryStatusDialog
        category={statusTarget}
        isSubmitting={statusMutation.isPending}
        onClose={() => setStatusTarget(null)}
        onConfirm={async () => {
          if (statusTarget) await statusMutation.mutateAsync(statusTarget);
        }}
      />

      <CategoryDeleteDialog
        category={deleteTarget}
        isDeleting={deleteMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await deleteMutation.mutateAsync(deleteTarget);
        }}
      />

      <Snackbar
        open={successMessage !== null}
        autoHideDuration={5000}
        onClose={() => setSuccessMessage(null)}
      >
        <Alert severity="success" variant="filled" onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      </Snackbar>
    </Stack>
  );
}

function parseCategoryListParams(searchParams: URLSearchParams): CategoryListParams {
  const sort = searchParams.get('sort') ?? 'name:asc';
  const [sortBy, sortOrder] = sort.split(':') as [
    CategoryListParams['sortBy'],
    CategoryListParams['sortOrder'],
  ];
  const isActive = searchParams.get('isActive');
  const page = Number(searchParams.get('page') ?? 1);
  const limit = Number(searchParams.get('limit') ?? 20);

  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    limit: [10, 20, 50].includes(limit) ? limit : 20,
    search: searchParams.get('search') ?? undefined,
    isActive: isActive === null ? undefined : isActive === 'true',
    sortBy: ['name', 'slug', 'createdAt', 'updatedAt'].includes(sortBy) ? sortBy : 'name',
    sortOrder: sortOrder === 'desc' ? 'desc' : 'asc',
  };
}

function updateSearchParams(
  setSearchParams: ReturnType<typeof useSearchParams>[1],
  updates: Record<string, string | number | boolean | undefined>,
) {
  setSearchParams((current) => {
    const next = new URLSearchParams(current);
    Object.entries(updates).forEach(([key, value]) => {
      const paramKey = key === 'sortBy' || key === 'sortOrder' ? 'sort' : key;
      if (key === 'sortBy' || key === 'sortOrder') return;
      if (value === undefined || String(value).trim().length === 0) next.delete(paramKey);
      else next.set(paramKey, String(value));
    });
    if (updates.sortBy || updates.sortOrder) {
      const sortBy = updates.sortBy ?? parseCategoryListParams(current).sortBy;
      const sortOrder = updates.sortOrder ?? parseCategoryListParams(current).sortOrder;
      next.set('sort', `${sortBy}:${sortOrder}`);
    }
    return next;
  });
}
