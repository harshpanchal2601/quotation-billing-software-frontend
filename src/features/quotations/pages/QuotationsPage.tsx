import NoteAddOutlinedIcon from '@mui/icons-material/NoteAddOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Snackbar from '@mui/material/Snackbar';
import TablePagination from '@mui/material/TablePagination';
import Typography from '@mui/material/Typography';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { ErrorState } from '../../../components/common/ErrorState';
import { RefreshIndicator } from '../../../components/common/RefreshIndicator';
import { toApiError } from '../../../services/apiClient';
import { listCompaniesRequest } from '../../companies/api/companies.api';
import {
  deleteQuotationRequest,
  listQuotationsRequest,
  updateQuotationStatusRequest,
} from '../api/quotations.api';
import { QuotationDeleteDialog } from '../components/QuotationDeleteDialog';
import { QuotationFilters } from '../components/QuotationFilters';
import { QuotationStatusDialog } from '../components/QuotationStatusDialog';
import { QuotationTable } from '../components/QuotationTable';
import { quotationsQueryKeys } from '../quotations.query-keys';
import type { QuotationListItem, QuotationListParams, QuotationStatus } from '../quotations.types';

export function QuotationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [feedback, setFeedback] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Parse URL query params
  const params: QuotationListParams = useMemo(() => {
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 20;
    const search = searchParams.get('search') || undefined;
    const companyId = searchParams.get('companyId') ? Number(searchParams.get('companyId')) : undefined;
    const status = (searchParams.get('status') as QuotationStatus) || undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;
    const validFrom = searchParams.get('validFrom') || undefined;
    const validTo = searchParams.get('validTo') || undefined;
    const minTotal = searchParams.get('minTotal') ? Number(searchParams.get('minTotal')) : undefined;
    const maxTotal = searchParams.get('maxTotal') ? Number(searchParams.get('maxTotal')) : undefined;
    const sortBy = (searchParams.get('sortBy') as QuotationListParams['sortBy']) || 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') as QuotationListParams['sortOrder']) || 'desc';

    return {
      page,
      limit,
      search,
      companyId,
      status,
      dateFrom,
      dateTo,
      validFrom,
      validTo,
      minTotal,
      maxTotal,
      sortBy,
      sortOrder,
    };
  }, [searchParams]);

  // Fetch Quotation List
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: quotationsQueryKeys.list(params),
    queryFn: () => listQuotationsRequest(params),
    placeholderData: keepPreviousData,
  });

  // Fetch Companies for Filter Dropdown
  const { data: companiesData } = useQuery({
    queryKey: ['companies', 'filter-options'],
    queryFn: () => listCompaniesRequest({ page: 1, limit: 100, sortBy: 'name', sortOrder: 'asc' }),
  });

  const companyOptions = (companiesData?.companies || []).map((c) => ({ id: c.id, name: c.name }));

  // State for Status Dialog
  const [statusDialogTarget, setStatusDialogTarget] = useState<QuotationListItem | null>(null);
  // State for Delete Dialog
  const [deleteDialogTarget, setDeleteDialogTarget] = useState<QuotationListItem | null>(null);

  // Status Mutation
  const statusMutation = useMutation({
    mutationFn: ({ id, status, comment }: { id: number; status: QuotationStatus; comment?: string }) =>
      updateQuotationStatusRequest(id, { status, comment }),
    onSuccess: (updated) => {
      setFeedback({ open: true, message: `Quotation ${updated.quotationNumber} status updated to ${updated.status}`, severity: 'success' });
      queryClient.invalidateQueries({ queryKey: quotationsQueryKeys.all });
      setStatusDialogTarget(null);
    },
    onError: (error) => {
      const apiError = toApiError(error);
      if (!apiError.cancelled) setFeedback({ open: true, message: apiError.message, severity: 'error' });
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteQuotationRequest(id),
    onSuccess: () => {
      setFeedback({ open: true, message: 'Draft quotation deleted successfully', severity: 'success' });
      queryClient.invalidateQueries({ queryKey: quotationsQueryKeys.all });
      setDeleteDialogTarget(null);
    },
    onError: (error) => {
      const apiError = toApiError(error);
      if (!apiError.cancelled) setFeedback({ open: true, message: apiError.message, severity: 'error' });
    },
  });

  const handleFilterChange = (newParams: Partial<QuotationListParams>) => {
    const updated = { ...params, ...newParams };
    const nextSearchParams = new URLSearchParams();

    Object.entries(updated).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        nextSearchParams.set(key, String(val));
      }
    });

    setSearchParams(nextSearchParams);
  };

  const handleClearFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const handleChangePage = (_e: unknown, newPage: number) => {
    handleFilterChange({ page: newPage + 1 });
  };

  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFilterChange({ limit: Number(e.target.value), page: 1 });
  };

  const quotations = data?.quotations || [];
  const pagination = data?.pagination;
  const showRefreshing = isFetching && !isLoading;

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Quotations
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage quotation generation, calculation preview, draft updates, and status transitions.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<NoteAddOutlinedIcon />}
          onClick={() => navigate('/quotations/new')}
        >
          Create Quotation
        </Button>
      </Box>

      {/* Filters */}
      <QuotationFilters
        params={params}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        companyOptions={companyOptions}
      />

      {/* Content State */}
      <RefreshIndicator show={showRefreshing} label="Refreshing quotations..." />

      {isLoading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Skeleton variant="rectangular" height={50} sx={{ borderRadius: 2 }} />
          <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
        </Box>
      ) : isError ? (
        <ErrorState message={toApiError(error).message} onRetry={refetch} />
      ) : quotations.length === 0 ? (
        <Box sx={{ p: 6, textAlign: 'center', bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            No Quotations Found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {params.search || params.status || params.companyId
              ? 'No quotations match the active filters.'
              : 'You have not created any quotations yet.'}
          </Typography>
          {params.search || params.status || params.companyId ? (
            <Button variant="outlined" size="small" onClick={handleClearFilters}>
              Clear Filters
            </Button>
          ) : (
            <Button variant="contained" size="small" startIcon={<NoteAddOutlinedIcon />} onClick={() => navigate('/quotations/new')}>
              Create First Quotation
            </Button>
          )}
        </Box>
      ) : (
        <Box aria-busy={isLoading || showRefreshing}>
          <QuotationTable
            quotations={quotations}
            onOpenStatusDialog={(quo) => setStatusDialogTarget(quo)}
            onOpenDeleteDialog={(quo) => setDeleteDialogTarget(quo)}
          />

          {pagination ? (
            <TablePagination
              component="div"
              count={pagination.total}
              page={pagination.page - 1}
              onPageChange={handleChangePage}
              rowsPerPage={pagination.limit}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[10, 20, 50]}
              sx={{ mt: 2 }}
            />
          ) : null}
        </Box>
      )}

      {/* Status Transition Dialog */}
      {statusDialogTarget ? (
        <QuotationStatusDialog
          open={Boolean(statusDialogTarget)}
          quotationNumber={statusDialogTarget.quotationNumber}
          currentStatus={statusDialogTarget.status}
          isSubmitting={statusMutation.isPending}
          onClose={() => setStatusDialogTarget(null)}
          onConfirm={(targetStatus, comment) =>
            statusMutation.mutate({ id: statusDialogTarget.id, status: targetStatus, comment })
          }
        />
      ) : null}

      {/* Delete Confirmation Dialog */}
      {deleteDialogTarget ? (
        <QuotationDeleteDialog
          open={Boolean(deleteDialogTarget)}
          quotationNumber={deleteDialogTarget.quotationNumber}
          customerName={deleteDialogTarget.companyNameSnapshot}
          grandTotal={deleteDialogTarget.grandTotal}
          currency={deleteDialogTarget.currency}
          isSubmitting={deleteMutation.isPending}
          onClose={() => setDeleteDialogTarget(null)}
          onConfirm={() => deleteMutation.mutate(deleteDialogTarget.id)}
        />
      ) : null}

      {/* Feedback Snackbar */}
      <Snackbar
        open={feedback.open}
        autoHideDuration={4000}
        onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
      >
        <Alert severity={feedback.severity} onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}>
          {feedback.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
