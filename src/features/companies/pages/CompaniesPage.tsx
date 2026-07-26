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
import { Link as RouterLink, useSearchParams } from 'react-router-dom';

import { EmptyState } from '../../../components/common/EmptyState';
import { ErrorState } from '../../../components/common/ErrorState';
import { RefreshIndicator } from '../../../components/common/RefreshIndicator';
import { paths } from '../../../routes/routeConfig';
import { toApiError } from '../../../services/apiClient';
import { deleteCompanyRequest, listCompaniesRequest, updateCompanyStatusRequest } from '../api/companies.api';
import { companiesQueryKeys } from '../companies.query-keys';
import type { CompanyListItem, CompanyListParams } from '../companies.types';
import { CompanyStatusDialog, DeleteCompanyDialog } from '../components/CompanyConfirmDialogs';
import { CompanyTable } from '../components/CompanyTable';

const sortOptions = [
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'createdAt:asc', label: 'Oldest first' },
  { value: 'name:asc', label: 'Company name A-Z' },
  { value: 'name:desc', label: 'Company name Z-A' },
  { value: 'companyCode:asc', label: 'Company code ascending' },
  { value: 'companyCode:desc', label: 'Company code descending' },
  { value: 'updatedAt:desc', label: 'Recently updated' },
] as const;

export function CompaniesPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '');
  const [deleteTarget, setDeleteTarget] = useState<CompanyListItem | null>(null);
  const [statusTarget, setStatusTarget] = useState<CompanyListItem | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const params = parseListParams(searchParams);

  useEffect(() => setSearchInput(searchParams.get('search') ?? ''), [searchParams]);
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      updateSearchParams(setSearchParams, { search: searchInput.trim() || undefined, page: 1 });
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [searchInput, setSearchParams]);

  const query = useQuery({
    queryKey: companiesQueryKeys.list(params),
    queryFn: () => listCompaniesRequest(params),
    placeholderData: keepPreviousData,
  });

  const statusMutation = useMutation({
    mutationFn: (company: CompanyListItem) => updateCompanyStatusRequest(company.id, !company.isActive),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: companiesQueryKeys.all });
      setStatusTarget(null);
      setSuccessMessage('Company status updated.');
    },
    onError: (error) => setPageError(toApiError(error).message),
  });

  const deleteMutation = useMutation({
    mutationFn: (company: CompanyListItem) => deleteCompanyRequest(company.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: companiesQueryKeys.lists() });
      setDeleteTarget(null);
      setSuccessMessage('Company deleted.');
    },
    onError: (error) => setPageError(toApiError(error).message),
  });

  const sortValue = `${params.sortBy}:${params.sortOrder}`;
  const isFiltered = Boolean(params.search || params.isActive !== undefined);
  const busyCompanyId = statusMutation.isPending
    ? statusMutation.variables?.id
    : deleteMutation.isPending
      ? deleteMutation.variables?.id
      : null;
  const showRefreshing = query.isFetching && !query.isPending;

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between">
        <Box>
          <Typography component="h1" variant="h1">Companies</Typography>
          <Typography color="text.secondary">Manage customer companies, contacts, addresses and quotation history.</Typography>
        </Box>
        <Button component={RouterLink} to={paths.newCompany} variant="contained" startIcon={<AddOutlinedIcon />}>Add Company</Button>
      </Stack>
      {pageError ? <Alert severity="error" onClose={() => setPageError(null)}>{pageError}</Alert> : null}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField label="Search companies" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} fullWidth />
        <TextField select label="Status" value={params.isActive === undefined ? 'all' : String(params.isActive)} onChange={(event) => updateSearchParams(setSearchParams, { isActive: event.target.value === 'all' ? undefined : event.target.value === 'true', page: 1 })} sx={{ minWidth: 160 }}>
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="true">Active</MenuItem>
          <MenuItem value="false">Inactive</MenuItem>
        </TextField>
        <TextField select label="Sort" value={sortValue} onChange={(event) => {
          const [sortBy, sortOrder] = event.target.value.split(':') as [CompanyListParams['sortBy'], CompanyListParams['sortOrder']];
          updateSearchParams(setSearchParams, { sortBy, sortOrder, page: 1 });
        }} sx={{ minWidth: 220 }}>
          {sortOptions.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
        </TextField>
      </Stack>
      <RefreshIndicator show={showRefreshing} />
      <Box aria-busy={query.isPending || showRefreshing}>
      {query.isPending ? <Stack spacing={1}>{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} height={64} />)}</Stack> : null}
      {query.isError ? (
        <Stack spacing={1}>
          <ErrorState message={toApiError(query.error).message} />
          <Button variant="outlined" onClick={() => void query.refetch()}>Retry</Button>
        </Stack>
      ) : null}
      {query.data && query.data.companies.length === 0 ? (
        <EmptyState title={isFiltered ? 'No companies match the filters' : 'No companies yet'} description={isFiltered ? 'Adjust search or filters to see more companies.' : 'Add a company to start building quotation recipients.'} />
      ) : null}
      {query.data && query.data.companies.length > 0 ? (
        <>
          <Typography color="text.secondary">{query.data.pagination.total} companies found</Typography>
          <CompanyTable companies={query.data.companies} busyCompanyId={busyCompanyId} onStatusChange={setStatusTarget} onDelete={setDeleteTarget} />
          <TablePagination
            component="div"
            count={query.data.pagination.total}
            page={params.page - 1}
            rowsPerPage={params.limit}
            rowsPerPageOptions={[10, 20, 50]}
            onPageChange={(_event, nextPage) => updateSearchParams(setSearchParams, { page: nextPage + 1 })}
            onRowsPerPageChange={(event) => updateSearchParams(setSearchParams, { limit: Number(event.target.value), page: 1 })}
          />
        </>
      ) : null}
      </Box>
      <CompanyStatusDialog company={statusTarget} isSubmitting={statusMutation.isPending} onClose={() => setStatusTarget(null)} onConfirm={async () => { if (statusTarget) await statusMutation.mutateAsync(statusTarget); }} />
      <DeleteCompanyDialog company={deleteTarget} isDeleting={deleteMutation.isPending} onClose={() => setDeleteTarget(null)} onConfirm={async () => { if (deleteTarget) await deleteMutation.mutateAsync(deleteTarget); }} />
      <Snackbar open={successMessage !== null} autoHideDuration={5000} onClose={() => setSuccessMessage(null)}>
        <Alert severity="success" variant="filled" onClose={() => setSuccessMessage(null)}>{successMessage}</Alert>
      </Snackbar>
    </Stack>
  );
}

function parseListParams(searchParams: URLSearchParams): CompanyListParams {
  const sort = searchParams.get('sort') ?? 'createdAt:desc';
  const [sortBy, sortOrder] = sort.split(':') as [CompanyListParams['sortBy'], CompanyListParams['sortOrder']];
  const isActive = searchParams.get('isActive');
  const page = Number(searchParams.get('page') ?? 1);
  const limit = Number(searchParams.get('limit') ?? 20);
  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    limit: [10, 20, 50].includes(limit) ? limit : 20,
    search: searchParams.get('search') ?? undefined,
    isActive: isActive === null ? undefined : isActive === 'true',
    sortBy: ['companyCode', 'name', 'createdAt', 'updatedAt'].includes(sortBy) ? sortBy : 'createdAt',
    sortOrder: sortOrder === 'asc' ? 'asc' : 'desc',
  };
}

function updateSearchParams(setSearchParams: ReturnType<typeof useSearchParams>[1], updates: Record<string, string | number | boolean | undefined>) {
  setSearchParams((current) => {
    const next = new URLSearchParams(current);
    Object.entries(updates).forEach(([key, value]) => {
      const paramKey = key === 'sortBy' || key === 'sortOrder' ? 'sort' : key;
      if (key === 'sortBy' || key === 'sortOrder') return;
      if (value === undefined || String(value).trim().length === 0) next.delete(paramKey);
      else next.set(paramKey, String(value));
    });
    if (updates.sortBy || updates.sortOrder) {
      const sortBy = updates.sortBy ?? parseListParams(current).sortBy;
      const sortOrder = updates.sortOrder ?? parseListParams(current).sortOrder;
      next.set('sort', `${sortBy}:${sortOrder}`);
    }
    return next;
  });
}
