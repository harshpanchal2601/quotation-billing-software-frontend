import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { EmptyState } from '@shared/components/common/EmptyState';
import { ErrorState } from '@shared/components/common/ErrorState';
import { AppButton } from '@shared/ui/actions';
import { AppTablePagination, DataTableShell, TableSkeleton } from '@shared/ui/tables';
import { toApiError } from '@shared/api/apiClient';
import { listCompanyQuotationsRequest } from '../api/companies.api';
import { companiesQueryKeys } from '../companies.query-keys';
import type { QuotationHistoryParams, QuotationStatus } from '../companies.types';
import { formatCurrency, formatReadableDate } from '../companies.utils';

const statuses: Array<QuotationStatus | ''> = ['', 'DRAFT', 'PENDING', 'SENT', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'EXPIRED', 'CANCELLED'];

export function CompanyQuotationHistory({ companyId }: { companyId: number }) {
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down('md'));
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
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'flex-start' }}>
        <TextField select label="Status" value={status} onChange={(event) => { setStatus(event.target.value as QuotationStatus | ''); setPage(0); }} sx={{ minWidth: { xs: 0, md: 180 }, width: { xs: '100%', md: 'auto' } }}>
          {statuses.map((item) => <MenuItem key={item || 'all'} value={item}>{item || 'All statuses'}</MenuItem>)}
        </TextField>
        <TextField label="Date from" type="date" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setPage(0); }} InputLabelProps={{ shrink: true }} sx={{ width: { xs: '100%', md: 'auto' } }} />
        <TextField label="Date to" type="date" value={dateTo} onChange={(event) => { setDateTo(event.target.value); setPage(0); }} InputLabelProps={{ shrink: true }} error={dateRangeInvalid} helperText={dateRangeInvalid ? 'Date from cannot be later than date to' : undefined} sx={{ width: { xs: '100%', md: 'auto' } }} />
      </Stack>
      {dateRangeInvalid ? <Alert severity="error">Fix the date range to load quotations.</Alert> : null}
      <DataTableShell
        isLoading={query.isPending}
        isError={query.isError}
        isEmpty={Boolean(query.data && query.data.quotations.length === 0)}
        loadingContent={<TableSkeleton rowCount={3} rowHeight={56} />}
        errorContent={
          <Stack spacing={1}>
            <ErrorState message={toApiError(query.error).message} />
            <AppButton variant="outlined" onClick={() => void query.refetch()}>Retry</AppButton>
          </Stack>
        }
        emptyContent={<EmptyState title="No quotation history" description="Quotations linked to this company will appear here." />}
      >
        {query.data && query.data.quotations.length > 0 ? (
        <Paper variant="outlined">
          {isCompact ? (
            <Stack spacing={1.5} sx={{ p: 1.5 }} aria-label="Company quotation history cards">
              {query.data.quotations.map((quotation) => (
                <Card key={quotation.id} variant="outlined">
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle2" fontWeight={700} sx={{ wordBreak: 'break-word' }}>
                          {quotation.quotationNumber}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Revision {quotation.revisionNumber}
                        </Typography>
                      </Box>
                      <Typography variant="subtitle2" fontWeight={700} color="primary.main" sx={{ textAlign: 'right', wordBreak: 'break-word' }}>
                        {formatCurrency(quotation.grandTotal, quotation.currency)}
                      </Typography>
                    </Stack>
                    <Divider sx={{ my: 1.5 }} />
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
                      <HistoryMetric label="Quotation date" value={formatReadableDate(quotation.quotationDate)} />
                      <HistoryMetric label="Valid until" value={formatReadableDate(quotation.validUntil)} />
                      <HistoryMetric label="Status" value={quotation.status} />
                      <HistoryMetric label="Created" value={formatReadableDate(quotation.createdAt)} />
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          ) : (
            <DataTableShell
              isLoading={false}
              isError={false}
              isEmpty={false}
              loadingContent={null}
              errorContent={null}
              emptyContent={null}
            >
              <Table aria-label="Company quotation history" sx={{ minWidth: 840 }}>
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
            </DataTableShell>
          )}
          <AppTablePagination
            count={query.data.pagination.total}
            page={page + 1}
            rowsPerPage={limit}
            rowsPerPageOptions={[10, 20, 50]}
            onPageChange={(nextPage) => setPage(nextPage - 1)}
            onRowsPerPageChange={(nextLimit) => { setLimit(nextLimit); setPage(0); }}
          />
        </Paper>
        ) : null}
      </DataTableShell>
    </Stack>
  );
}

function HistoryMetric({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600} sx={{ wordBreak: 'break-word' }}>
        {value}
      </Typography>
    </Box>
  );
}
