import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { EmptyState } from '../../../components/common/EmptyState';
import { ErrorState } from '../../../components/common/ErrorState';
import { toApiError } from '../../../services/apiClient';
import { listCompanyQuotationsRequest } from '../api/companies.api';
import { companiesQueryKeys } from '../companies.query-keys';
import type { QuotationHistoryParams, QuotationStatus } from '../companies.types';
import { formatCurrency, formatReadableDate } from '../companies.utils';

const statuses: Array<QuotationStatus | ''> = ['', 'DRAFT', 'PENDING', 'SENT', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'EXPIRED', 'CANCELLED'];

export function CompanyQuotationHistory({ companyId }: { companyId: number }) {
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [status, setStatus] = useState<QuotationStatus | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const dateRangeInvalid = dateFrom.length > 0 && dateTo.length > 0 && dateFrom > dateTo;
  const params: QuotationHistoryParams = useMemo(() => ({
    page: page + 1,
    limit,
    sortOrder: 'desc',
    ...(status === '' ? {} : { status }),
    ...(dateFrom === '' ? {} : { dateFrom }),
    ...(dateTo === '' ? {} : { dateTo }),
  }), [dateFrom, dateTo, limit, page, status]);

  const query = useQuery({
    queryKey: companiesQueryKeys.quotations(companyId, params),
    queryFn: () => listCompanyQuotationsRequest(companyId, params),
    enabled: !dateRangeInvalid,
    placeholderData: keepPreviousData,
  });

  return (
    <Stack spacing={2}>
      <Typography component="h2" variant="h2">Quotation history</Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField select label="Status" value={status} onChange={(event) => { setStatus(event.target.value as QuotationStatus | ''); setPage(0); }} sx={{ minWidth: 180 }}>
          {statuses.map((item) => <MenuItem key={item || 'all'} value={item}>{item || 'All statuses'}</MenuItem>)}
        </TextField>
        <TextField label="Date from" type="date" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setPage(0); }} InputLabelProps={{ shrink: true }} />
        <TextField label="Date to" type="date" value={dateTo} onChange={(event) => { setDateTo(event.target.value); setPage(0); }} InputLabelProps={{ shrink: true }} error={dateRangeInvalid} helperText={dateRangeInvalid ? 'Date from cannot be later than date to' : undefined} />
      </Stack>
      {dateRangeInvalid ? <Alert severity="error">Fix the date range to load quotations.</Alert> : null}
      {query.isPending ? <Stack spacing={1}>{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} height={56} />)}</Stack> : null}
      {query.isError ? (
        <Stack spacing={1}>
          <ErrorState message={toApiError(query.error).message} />
          <Button variant="outlined" onClick={() => void query.refetch()}>Retry</Button>
        </Stack>
      ) : null}
      {query.data && query.data.quotations.length === 0 ? <EmptyState title="No quotation history" description="Quotations linked to this company will appear here." /> : null}
      {query.data && query.data.quotations.length > 0 ? (
        <Paper variant="outlined">
          <TableContainer>
            <Table aria-label="Company quotation history">
              <TableHead>
                <TableRow>
                  <TableCell>Quotation number</TableCell>
                  <TableCell>Revision</TableCell>
                  <TableCell>Quotation date</TableCell>
                  <TableCell>Valid until</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {query.data.quotations.map((quotation) => (
                  <TableRow key={quotation.id}>
                    <TableCell>{quotation.quotationNumber}</TableCell>
                    <TableCell>{quotation.revisionNumber}</TableCell>
                    <TableCell>{formatReadableDate(quotation.quotationDate)}</TableCell>
                    <TableCell>{formatReadableDate(quotation.validUntil)}</TableCell>
                    <TableCell>{quotation.status}</TableCell>
                    <TableCell>{formatCurrency(quotation.grandTotal, quotation.currency)}</TableCell>
                    <TableCell>{formatReadableDate(quotation.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={query.data.pagination.total}
            page={page}
            rowsPerPage={limit}
            rowsPerPageOptions={[10, 20, 50]}
            onPageChange={(_event, nextPage) => setPage(nextPage)}
            onRowsPerPageChange={(event) => { setLimit(Number(event.target.value)); setPage(0); }}
          />
        </Paper>
      ) : null}
    </Stack>
  );
}
