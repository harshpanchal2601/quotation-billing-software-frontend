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

import { EmptyState } from '@shared/components/common/EmptyState';
import { ErrorState } from '@shared/components/common/ErrorState';
import { RefreshIndicator } from '@shared/components/common/RefreshIndicator';
import { toApiError } from '@shared/api/apiClient';
import {
  deleteMeasurementUnitRequest,
  listMeasurementUnitsRequest,
  updateMeasurementUnitStatusRequest,
} from '../api/measurement-units.api';
import { measurementUnitsQueryKeys } from '../model/measurement-units.query-keys';
import type {
  MeasurementUnitListItem,
  MeasurementUnitListParams,
} from '../model/measurement-units.types';
import {
  MeasurementUnitDeleteDialog,
  MeasurementUnitStatusDialog,
} from '../components/MeasurementUnitConfirmDialogs';
import { MeasurementUnitDetailsDialog } from '../components/MeasurementUnitDetailsDialog';
import { MeasurementUnitFormDialog } from '../components/MeasurementUnitFormDialog';
import { MeasurementUnitTable } from '../components/MeasurementUnitTable';

const sortOptions = [
  { value: 'name:asc', label: 'Name A–Z' },
  { value: 'name:desc', label: 'Name Z–A' },
  { value: 'symbol:asc', label: 'Symbol A–Z' },
  { value: 'symbol:desc', label: 'Symbol Z–A' },
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'createdAt:asc', label: 'Oldest first' },
  { value: 'updatedAt:desc', label: 'Recently updated' },
] as const;

export function MeasurementUnitsPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '');

  const [formOpen, setFormOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<MeasurementUnitListItem | null>(null);
  const [detailsUnitId, setDetailsUnitId] = useState<number | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<MeasurementUnitListItem | null>(null);
  const [statusTarget, setStatusTarget] = useState<MeasurementUnitListItem | null>(null);

  const [pageError, setPageError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const params = parseUnitListParams(searchParams);

  useEffect(() => setSearchInput(searchParams.get('search') ?? ''), [searchParams]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      updateSearchParams(setSearchParams, { search: searchInput.trim() || undefined, page: 1 });
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [searchInput, setSearchParams]);

  const query = useQuery({
    queryKey: measurementUnitsQueryKeys.list(params),
    queryFn: () => listMeasurementUnitsRequest(params),
    placeholderData: keepPreviousData,
  });

  const statusMutation = useMutation({
    mutationFn: (unit: MeasurementUnitListItem) =>
      updateMeasurementUnitStatusRequest(unit.id, !unit.isActive),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: measurementUnitsQueryKeys.all });
      setStatusTarget(null);
      setSuccessMessage('Measurement unit status updated.');
    },
    onError: (error) => setPageError(toApiError(error).message),
  });

  const deleteMutation = useMutation({
    mutationFn: (unit: MeasurementUnitListItem) => deleteMeasurementUnitRequest(unit.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: measurementUnitsQueryKeys.all });
      setDeleteTarget(null);
      setSuccessMessage('Measurement unit deleted.');
    },
    onError: (error) => setPageError(toApiError(error).message),
  });

  const sortValue = `${params.sortBy}:${params.sortOrder}`;
  const isFiltered = Boolean(
    params.search || params.isActive !== undefined || params.allowDecimal !== undefined,
  );
  const busyUnitId = statusMutation.isPending
    ? statusMutation.variables?.id
    : deleteMutation.isPending
      ? deleteMutation.variables?.id
      : null;
  const showRefreshing = query.isFetching && !query.isPending;

  function handleOpenCreate() {
    setEditingUnit(null);
    setFormOpen(true);
  }

  function handleOpenEdit(unit: MeasurementUnitListItem) {
    setEditingUnit(unit);
    setFormOpen(true);
  }

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ sm: 'center' }}>
        <Box>
          <Typography component="h1" variant="h1">
            Measurement Units
          </Typography>
          <Typography color="text.secondary">
            Manage units of measurement for item pricing and quantities.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddOutlinedIcon />} onClick={handleOpenCreate}>
          Add Measurement Unit
        </Button>
      </Stack>

      {pageError ? <Alert severity="error" onClose={() => setPageError(null)}>{pageError}</Alert> : null}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField
          label="Search units"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search by name or symbol"
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
          sx={{ minWidth: { xs: 0, md: 150 }, width: { xs: '100%', md: 'auto' } }}
        >
          <MenuItem value="all">All Statuses</MenuItem>
          <MenuItem value="true">Active</MenuItem>
          <MenuItem value="false">Inactive</MenuItem>
        </TextField>

        <TextField
          select
          label="Quantity Type"
          value={params.allowDecimal === undefined ? 'all' : String(params.allowDecimal)}
          onChange={(event) =>
            updateSearchParams(setSearchParams, {
              allowDecimal: event.target.value === 'all' ? undefined : event.target.value === 'true',
              page: 1,
            })
          }
          sx={{ minWidth: { xs: 0, md: 200 }, width: { xs: '100%', md: 'auto' } }}
        >
          <MenuItem value="all">All Quantity Types</MenuItem>
          <MenuItem value="true">Allows Decimal</MenuItem>
          <MenuItem value="false">Whole Quantities Only</MenuItem>
        </TextField>

        <TextField
          select
          label="Sort"
          value={sortValue}
          onChange={(event) => {
            const [sortBy, sortOrder] = event.target.value.split(':') as [
              MeasurementUnitListParams['sortBy'],
              MeasurementUnitListParams['sortOrder'],
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

      {query.data && query.data.measurementUnits.length === 0 ? (
        <EmptyState
          title={isFiltered ? 'No measurement units match the filters' : 'No measurement units created yet'}
          description={
            isFiltered
              ? 'Adjust search, status or quantity type filters to view measurement units.'
              : 'Add a measurement unit to start assigning units to quotation items.'
          }
        />
      ) : null}

      {query.data && query.data.measurementUnits.length > 0 ? (
        <>
          <Typography color="text.secondary">
            {query.data.pagination.total} measurement unit(s) found
          </Typography>

          <MeasurementUnitTable
            units={query.data.measurementUnits}
            busyUnitId={busyUnitId}
            onView={(u) => setDetailsUnitId(u.id)}
            onEdit={handleOpenEdit}
            onStatusChange={(u) => setStatusTarget(u)}
            onDelete={(u) => setDeleteTarget(u)}
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

      <MeasurementUnitFormDialog
        open={formOpen}
        unit={editingUnit}
        onClose={() => setFormOpen(false)}
        onSuccess={(msg) => setSuccessMessage(msg)}
      />

      <MeasurementUnitDetailsDialog
        unitId={detailsUnitId}
        onClose={() => setDetailsUnitId(null)}
        onEdit={(u) => handleOpenEdit(u)}
      />

      <MeasurementUnitStatusDialog
        unit={statusTarget}
        isSubmitting={statusMutation.isPending}
        onClose={() => setStatusTarget(null)}
        onConfirm={async () => {
          if (statusTarget) await statusMutation.mutateAsync(statusTarget);
        }}
      />

      <MeasurementUnitDeleteDialog
        unit={deleteTarget}
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

function parseUnitListParams(searchParams: URLSearchParams): MeasurementUnitListParams {
  const sort = searchParams.get('sort') ?? 'name:asc';
  const [sortBy, sortOrder] = sort.split(':') as [
    MeasurementUnitListParams['sortBy'],
    MeasurementUnitListParams['sortOrder'],
  ];
  const isActive = searchParams.get('isActive');
  const allowDecimal = searchParams.get('allowDecimal');
  const page = Number(searchParams.get('page') ?? 1);
  const limit = Number(searchParams.get('limit') ?? 20);

  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    limit: [10, 20, 50].includes(limit) ? limit : 20,
    search: searchParams.get('search') ?? undefined,
    isActive: isActive === null ? undefined : isActive === 'true',
    allowDecimal: allowDecimal === null ? undefined : allowDecimal === 'true',
    sortBy: ['name', 'symbol', 'createdAt', 'updatedAt'].includes(sortBy) ? sortBy : 'name',
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
      const sortBy = updates.sortBy ?? parseUnitListParams(current).sortBy;
      const sortOrder = updates.sortOrder ?? parseUnitListParams(current).sortOrder;
      next.set('sort', `${sortBy}:${sortOrder}`);
    }
    return next;
  });
}
