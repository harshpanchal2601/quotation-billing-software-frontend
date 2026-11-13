import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { PERMISSIONS, useHasPermission } from '@features/auth';
import { toApiError } from '@shared/api/apiClient';
import { EmptyState } from '@shared/components/common/EmptyState';
import { ErrorState } from '@shared/components/common/ErrorState';
import { paths } from '@shared/routing/paths';
import { AppButton } from '@shared/ui/actions';
import { formatRecordStatus } from '@shared/ui/display';
import { DetailSection } from '@shared/ui/layout';
import { AppTablePagination, DataTableShell, RecordTable, TableSkeleton, TableSortControls, useTableSort } from '@shared/ui/tables';
import { listCompanyQuotationsRequest } from '../api/companies.api';
import { companiesQueryKeys } from '../model/companies.query-keys';
import type { CompanyQuotation, QuotationHistoryParams, QuotationStatus } from '../model/companies.types';
import { formatCurrency, formatReadableDate } from '../model/companies.utils';

const statuses: Array<QuotationStatus | ''> = ['', 'DRAFT', 'PENDING', 'SENT', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'EXPIRED', 'CANCELLED'];
const sortFields = [
  { key: 'quotationNumber', label: 'Quotation number' },
  { key: 'revisionNumber', label: 'Revision' },
  { key: 'quotationDate', label: 'Quotation date' },
  { key: 'validUntil', label: 'Valid until' },
  { key: 'status', label: 'Status' },
  { key: 'currency', label: 'Currency' },
  { key: 'grandTotal', label: 'Amount' },
  { key: 'createdAt', label: 'Created' },
];

export function CompanyQuotationHistory({ companyId }: { companyId: number }) {
  const canViewQuotations = useHasPermission(PERMISSIONS.QUOTATIONS_VIEW);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [status, setStatus] = useState<QuotationStatus | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const sorting = useTableSort(sortFields, { defaultSortBy: 'quotationDate', defaultSortOrder: 'desc', paramPrefix: 'companyQuotation', onChange: () => setPage(0) });
  const dateRangeInvalid = dateFrom.length > 0 && dateTo.length > 0 && dateFrom > dateTo;
  const params: QuotationHistoryParams = useMemo(() => ({
    page: page + 1,
    limit,
    sortBy: sorting.sortBy as NonNullable<QuotationHistoryParams['sortBy']>,
    sortOrder: sorting.sortOrder,
    ...(status === '' ? {} : { status }),
    ...(dateFrom === '' ? {} : { dateFrom }),
    ...(dateTo === '' ? {} : { dateTo }),
  }), [dateFrom, dateTo, limit, page, sorting.sortBy, sorting.sortOrder, status]);

  const query = useQuery({
    queryKey: companiesQueryKeys.quotations(companyId, params),
    queryFn: () => listCompanyQuotationsRequest(companyId, params),
    enabled: !dateRangeInvalid,
    placeholderData: (previous, previousQuery) => previousQuery?.queryKey[2] === companyId ? previous : undefined,
  });

  return (
    <DetailSection title="Quotation history" description="Quotations linked to this company, including their latest revision and amount.">
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'flex-start' }}>
        <TextField id="company-quotation-status" name="quotationHistoryStatus" select SelectProps={{ native: true }} InputLabelProps={{ shrink: true }} label="Status" value={status} onChange={(event) => { setStatus(event.target.value as QuotationStatus | ''); setPage(0); }} sx={{ minWidth: { xs: 0, md: 180 }, width: { xs: '100%', md: 'auto' } }}>
          {statuses.map((item) => <option key={item || 'all'} value={item}>{item ? formatRecordStatus(item) : 'All statuses'}</option>)}
        </TextField>
        <TextField name="quotationHistoryDateFrom" label="Date from" type="date" value={dateFrom} inputProps={{ max: dateTo || undefined }} onChange={(event) => { setDateFrom(event.target.value); setPage(0); }} InputLabelProps={{ shrink: true }} sx={{ width: { xs: '100%', md: 'auto' } }} />
        <TextField name="quotationHistoryDateTo" label="Date to" type="date" value={dateTo} inputProps={{ min: dateFrom || undefined }} onChange={(event) => { setDateTo(event.target.value); setPage(0); }} InputLabelProps={{ shrink: true }} error={dateRangeInvalid} helperText={dateRangeInvalid ? 'Date from cannot be later than date to' : undefined} sx={{ width: { xs: '100%', md: 'auto' } }} />
      </Stack>
      <TableSortControls {...sorting} />
      {dateRangeInvalid ? <Alert severity="error">Fix the date range to load quotations.</Alert> : (
        <DataTableShell
          isLoading={query.isPending}
          isError={query.isError}
          isEmpty={Boolean(query.data && query.data.quotations.length === 0)}
          isRefreshing={query.isFetching}
          loadingContent={<TableSkeleton rowCount={3} rowHeight={56} />}
          errorContent={<ErrorState message={toApiError(query.error).message} onRetry={() => { void query.refetch(); }} />}
          emptyContent={<EmptyState title="No quotation history" description="Quotations linked to this company will appear here. Try changing the filters if a quotation is missing." />}
          wrapInTableContainer={false}
          pagination={query.data ? <AppTablePagination count={query.data.pagination.total} page={page + 1} rowsPerPage={limit} rowsPerPageOptions={[10, 20, 50]} onPageChange={(nextPage) => setPage(nextPage - 1)} onRowsPerPageChange={(nextLimit) => { setLimit(nextLimit); setPage(0); }} /> : null}
        >
          <RecordTable
            rows={query.data?.quotations ?? []}
            rowKey={(quotation) => quotation.id}
            label="Company quotation history"
            rowNumberStart={page * limit + 1}
            sorting={sorting}
            showSortControls={false}
            columns={[
              { key: 'quotationNumber', label: 'Quotation number', sortKey: 'quotationNumber', render: (quotation) => quotation.quotationNumber },
              { key: 'revisionNumber', label: 'Revision', sortKey: 'revisionNumber', align: 'right', render: (quotation) => quotation.revisionNumber },
              { key: 'quotationDate', label: 'Quotation date', sortKey: 'quotationDate', noWrap: true, render: (quotation) => formatReadableDate(quotation.quotationDate) },
              { key: 'validUntil', label: 'Valid until', sortKey: 'validUntil', noWrap: true, render: (quotation) => formatReadableDate(quotation.validUntil) },
              { key: 'status', label: 'Status', sortKey: 'status', noWrap: true, render: (quotation) => formatRecordStatus(quotation.status) },
              { key: 'currency', label: 'Currency', sortKey: 'currency', render: (quotation) => quotation.currency },
              { key: 'grandTotal', label: 'Amount', sortKey: 'grandTotal', align: 'right', render: (quotation) => formatCurrency(quotation.grandTotal, quotation.currency) },
              { key: 'createdAt', label: 'Created', sortKey: 'createdAt', noWrap: true, render: (quotation) => formatReadableDate(quotation.createdAt) },
              ...(canViewQuotations ? [{ key: 'actions', label: 'Actions', render: (quotation: CompanyQuotation) => <AppButton component={RouterLink} to={`${paths.quotations}/${quotation.id}`} size="small" aria-label={`View quotation ${quotation.quotationNumber}`}>View</AppButton> }] : []),
            ]}
          />
        </DataTableShell>
      )}
    </DetailSection>
  );
}
