import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { EmptyState } from '@shared/components/common/EmptyState';
import { ErrorState } from '@shared/components/common/ErrorState';
import { RefreshIndicator } from '@shared/components/common/RefreshIndicator';
import { AppButton } from '@shared/ui/actions';
import { AppSnackbar, ServerErrorAlert } from '@shared/ui/feedback';
import { AppTablePagination, DataTableShell, TableSkeleton } from '@shared/ui/tables';
import { paths } from '@app/router/routeConfig';
import { getCurrentListReturnState } from '@app/router/returnNavigation';
import { toApiError } from '@shared/api/apiClient';
import { categoriesQueryKeys, getCategoryOptionsRequest } from '@features/categories';
import { getMeasurementUnitOptionsRequest, measurementUnitsQueryKeys } from '@features/measurement-units';

import { deleteItemRequest, listItemsRequest, updateItemStatusRequest } from '../api/items.api';
import { ItemDeleteDialog, ItemStatusDialog } from '../components/ItemConfirmDialogs';
import { ItemTable } from '../components/ItemTable';
import { itemsQueryKeys } from '../items.query-keys';
import type { ItemListItem, ItemListParams } from '../items.types';

const sortOptions = [
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'createdAt:asc', label: 'Oldest first' },
  { value: 'updatedAt:desc', label: 'Recently updated' },
  { value: 'name:asc', label: 'Item name A–Z' },
  { value: 'name:desc', label: 'Item name Z–A' },
  { value: 'itemCode:asc', label: 'Item code (ascending)' },
  { value: 'itemCode:desc', label: 'Item code (descending)' },
  { value: 'defaultRate:asc', label: 'Rate (low to high)' },
  { value: 'defaultRate:desc', label: 'Rate (high to low)' },
  { value: 'gstRate:asc', label: 'GST (low to high)' },
  { value: 'gstRate:desc', label: 'GST (high to low)' },
] as const;

export function ItemsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '');

  const [deleteTarget, setDeleteTarget] = useState<ItemListItem | null>(null);
  const [statusTarget, setStatusTarget] = useState<ItemListItem | null>(null);

  const [pageError, setPageError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const params = parseItemListParams(searchParams);

  useEffect(() => setSearchInput(searchParams.get('search') ?? ''), [searchParams]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const nextSearch = searchInput.trim();
      if (nextSearch === (searchParams.get('search') ?? '')) return;
      updateSearchParams(setSearchParams, { search: nextSearch || undefined, page: 1 });
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [searchInput, searchParams, setSearchParams]);

  const categoriesQuery = useQuery({
    queryKey: categoriesQueryKeys.options(),
    queryFn: getCategoryOptionsRequest,
  });

  const unitsQuery = useQuery({
    queryKey: measurementUnitsQueryKeys.options(),
    queryFn: getMeasurementUnitOptionsRequest,
  });

  const query = useQuery({
    queryKey: itemsQueryKeys.list(params),
    queryFn: () => listItemsRequest(params),
    placeholderData: keepPreviousData,
  });

  const statusMutation = useMutation({
    mutationFn: (item: ItemListItem) => updateItemStatusRequest(item.id, !item.isActive),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: itemsQueryKeys.all });
      setStatusTarget(null);
      setSuccessMessage('Item status updated.');
    },
    onError: (error) => setPageError(toApiError(error).message),
  });

  const deleteMutation = useMutation({
    mutationFn: (item: ItemListItem) => deleteItemRequest(item.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: itemsQueryKeys.all });
      setDeleteTarget(null);
      setSuccessMessage('Item deleted.');
    },
    onError: (error) => setPageError(toApiError(error).message),
  });

  const sortValue = `${params.sortBy}:${params.sortOrder}`;
  const isFiltered = Boolean(
    params.search ||
      params.categoryId !== undefined ||
      params.measurementUnitId !== undefined ||
      params.isActive !== undefined ||
      params.sourceType !== undefined ||
      params.minRate !== undefined ||
      params.maxRate !== undefined,
  );
  const busyItemId = statusMutation.isPending
    ? statusMutation.variables?.id
    : deleteMutation.isPending
      ? deleteMutation.variables?.id
      : null;
  const showRefreshing = query.isFetching && !query.isPending;
  const listReturnState = getCurrentListReturnState(location.pathname, location.search);

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ sm: 'center' }}>
        <Box>
          <Typography component="h1" variant="h1">
            Items
          </Typography>
          <Typography color="text.secondary">
            Manage equipment, products and services for quotation line items.
          </Typography>
        </Box>
        <AppButton
          variant="contained"
          startIcon={<AddOutlinedIcon />}
          onClick={() => navigate(paths.newCompany ? `${paths.items}/new` : `${paths.items}/new`)}
        >
          Add Item
        </AppButton>
      </Stack>

      <ServerErrorAlert message={pageError} onDismiss={() => setPageError(null)} />

      <Stack spacing={2}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            label="Search items"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by name, code, description or HSN"
            fullWidth
          />

          <TextField
            select
            label="Category"
            value={params.categoryId === undefined ? 'all' : String(params.categoryId)}
            onChange={(event) =>
              updateSearchParams(setSearchParams, {
                categoryId: event.target.value === 'all' ? undefined : Number(event.target.value),
                page: 1,
              })
            }
            sx={{ minWidth: { xs: 0, md: 180 }, width: { xs: '100%', md: 'auto' } }}
          >
            <MenuItem value="all">All Categories</MenuItem>
            {categoriesQuery.data?.map((cat) => (
              <MenuItem key={cat.id} value={cat.id}>
                {cat.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Measurement Unit"
            value={params.measurementUnitId === undefined ? 'all' : String(params.measurementUnitId)}
            onChange={(event) =>
              updateSearchParams(setSearchParams, {
                measurementUnitId: event.target.value === 'all' ? undefined : Number(event.target.value),
                page: 1,
              })
            }
            sx={{ minWidth: { xs: 0, md: 180 }, width: { xs: '100%', md: 'auto' } }}
          >
            <MenuItem value="all">All Units</MenuItem>
            {unitsQuery.data?.map((unit) => (
              <MenuItem key={unit.id} value={unit.id}>
                {unit.symbol} ({unit.name})
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
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
            sx={{ minWidth: { xs: 0, md: 140 }, width: { xs: '100%', md: 'auto' } }}
          >
            <MenuItem value="all">All Statuses</MenuItem>
            <MenuItem value="true">Active</MenuItem>
            <MenuItem value="false">Inactive</MenuItem>
          </TextField>

          <TextField
            select
            label="Source"
            value={params.sourceType === undefined ? 'all' : params.sourceType}
            onChange={(event) =>
              updateSearchParams(setSearchParams, {
                sourceType: event.target.value === 'all' ? undefined : event.target.value,
                page: 1,
              })
            }
            sx={{ minWidth: { xs: 0, md: 160 }, width: { xs: '100%', md: 'auto' } }}
          >
            <MenuItem value="all">All Sources</MenuItem>
            <MenuItem value="MANUAL">Manual</MenuItem>
            <MenuItem value="WEBSITE_IMPORT">Website import</MenuItem>
            <MenuItem value="CSV_IMPORT">CSV import</MenuItem>
          </TextField>

          <TextField
            label="Min Rate (₹)"
            type="number"
            value={params.minRate === undefined ? '' : String(params.minRate)}
            onChange={(event) => {
              const val = event.target.value.trim();
              updateSearchParams(setSearchParams, {
                minRate: val.length > 0 && !isNaN(Number(val)) ? Number(val) : undefined,
                page: 1,
              });
            }}
            sx={{ width: { xs: '100%', md: 140 } }}
          />

          <TextField
            label="Max Rate (₹)"
            type="number"
            value={params.maxRate === undefined ? '' : String(params.maxRate)}
            onChange={(event) => {
              const val = event.target.value.trim();
              updateSearchParams(setSearchParams, {
                maxRate: val.length > 0 && !isNaN(Number(val)) ? Number(val) : undefined,
                page: 1,
              });
            }}
            sx={{ width: { xs: '100%', md: 140 } }}
          />

          <TextField
            select
            label="Sort"
            value={sortValue}
            onChange={(event) => {
              const [sortBy, sortOrder] = event.target.value.split(':') as [
                ItemListParams['sortBy'],
                ItemListParams['sortOrder'],
              ];
              updateSearchParams(setSearchParams, { sortBy, sortOrder, page: 1 });
            }}
            sx={{ minWidth: { xs: 0, md: 200 }, width: { xs: '100%', md: 'auto' } }}
          >
            {sortOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Stack>

      <DataTableShell
        isLoading={query.isPending}
        isError={query.isError}
        isEmpty={Boolean(query.data && query.data.items.length === 0)}
        isRefreshing={showRefreshing}
        refreshIndicator={<RefreshIndicator show={showRefreshing} />}
        loadingContent={<TableSkeleton />}
        errorContent={
          <Stack spacing={1}>
            <ErrorState message={toApiError(query.error).message} />
            <AppButton variant="outlined" sx={{ alignSelf: 'flex-start' }} onClick={() => void query.refetch()}>
              Retry
            </AppButton>
          </Stack>
        }
        emptyContent={
          <EmptyState
            title={isFiltered ? 'No items match the active filters' : 'No items created yet'}
            description={
              isFiltered
                ? 'Adjust search text, category, unit, rate or status filters to view items.'
                : 'Add product or service items to start building quotation catalog.'
            }
          />
        }
        pagination={
          query.data && query.data.items.length > 0 ? (
            <AppTablePagination
              count={query.data.pagination.total}
              page={params.page}
              rowsPerPage={params.limit}
              rowsPerPageOptions={[10, 20, 50]}
              onPageChange={(page) => updateSearchParams(setSearchParams, { page })}
              onRowsPerPageChange={(limit) => updateSearchParams(setSearchParams, { limit, page: 1 })}
            />
          ) : null
        }
      >
        {query.data && query.data.items.length > 0 ? (
          <>
          <Typography color="text.secondary">
            {query.data.pagination.total} item(s) found
          </Typography>

          <ItemTable
            items={query.data.items}
            busyItemId={busyItemId}
            onView={(itm) => navigate(`${paths.items}/${itm.id}`, { state: listReturnState })}
            onEdit={(itm) => navigate(`${paths.items}/${itm.id}/edit`, { state: listReturnState })}
            onStatusChange={(itm) => setStatusTarget(itm)}
            onDelete={(itm) => setDeleteTarget(itm)}
          />
          </>
        ) : null}
      </DataTableShell>

      <ItemStatusDialog
        item={statusTarget}
        isSubmitting={statusMutation.isPending}
        onClose={() => setStatusTarget(null)}
        onConfirm={() => {
          if (statusTarget) statusMutation.mutate(statusTarget);
        }}
      />

      <ItemDeleteDialog
        item={deleteTarget}
        isDeleting={deleteMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget);
        }}
      />

      <AppSnackbar open={successMessage !== null} autoHideDuration={4000} message={successMessage} onClose={() => setSuccessMessage(null)} />
    </Stack>
  );
}

function parseItemListParams(searchParams: URLSearchParams): ItemListParams {
  const sort = searchParams.get('sort') ?? 'createdAt:desc';
  const [sortBy, sortOrder] = sort.split(':') as [
    ItemListParams['sortBy'],
    ItemListParams['sortOrder'],
  ];
  const categoryId = searchParams.get('categoryId');
  const measurementUnitId = searchParams.get('measurementUnitId');
  const isActive = searchParams.get('isActive');
  const sourceType = searchParams.get('sourceType');
  const minRate = searchParams.get('minRate');
  const maxRate = searchParams.get('maxRate');

  const page = Number(searchParams.get('page') ?? 1);
  const limit = Number(searchParams.get('limit') ?? 20);

  const minNum = minRate !== null && !isNaN(Number(minRate)) ? Number(minRate) : undefined;
  const maxNum = maxRate !== null && !isNaN(Number(maxRate)) ? Number(maxRate) : undefined;

  let validMin = minNum;
  let validMax = maxNum;
  if (validMin !== undefined && validMax !== undefined && validMin > validMax) {
    validMin = undefined;
    validMax = undefined;
  }

  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    limit: [10, 20, 50].includes(limit) ? limit : 20,
    search: searchParams.get('search') ?? undefined,
    categoryId: categoryId !== null && !isNaN(Number(categoryId)) ? Number(categoryId) : undefined,
    measurementUnitId: measurementUnitId !== null && !isNaN(Number(measurementUnitId)) ? Number(measurementUnitId) : undefined,
    isActive: isActive === null ? undefined : isActive === 'true',
    sourceType: ['MANUAL', 'WEBSITE_IMPORT', 'CSV_IMPORT'].includes(sourceType ?? '')
      ? (sourceType as ItemListParams['sourceType'])
      : undefined,
    minRate: validMin,
    maxRate: validMax,
    sortBy: ['itemCode', 'name', 'defaultRate', 'gstRate', 'createdAt', 'updatedAt'].includes(sortBy) ? sortBy : 'createdAt',
    sortOrder: sortOrder === 'asc' ? 'asc' : 'desc',
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
      const sortBy = updates.sortBy ?? parseItemListParams(current).sortBy;
      const sortOrder = updates.sortOrder ?? parseItemListParams(current).sortOrder;
      next.set('sort', `${sortBy}:${sortOrder}`);
    }
    return next;
  });
}
