import { Alert, Stack, TextField, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { toApiError } from '@shared/api/apiClient';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { AppButton } from '@shared/ui/actions';
import { getReceivables } from './payments.api';
import { paymentsKeys } from './payments.queries';
import type { Allocation } from './payments.types';

export function AllocationFields({ companyId, currency, values, onChange }: { companyId: number; currency: string; values: Allocation[]; onChange: (values: Allocation[]) => void }) {
  const firmId = useFirmId(); const [page, setPage] = useState(1);
  const params = { companyId, currency, page, limit: 20 };
  const query = useQuery({ queryKey: paymentsKeys.receivables(firmId, params), queryFn: ({ signal }) => getReceivables(params, signal), enabled: firmId != null && companyId > 0 });
  function setAmount(invoiceId: number, amount: string) { onChange([...values.filter((entry) => entry.invoiceId !== invoiceId), ...(amount ? [{ invoiceId, amount }] : [])]); }
  return <Stack spacing={2}><Typography variant="h6">Explicit invoice allocations</Typography><Typography color="text.secondary">Leave allocation amounts empty to retain customer credit.</Typography>
    {query.isError ? <Alert severity="error">{toApiError(query.error).message}</Alert> : null}
    {query.isFetching ? <Typography>Loading eligible invoices…</Typography> : null}
    {query.data?.receivables.map((invoice) => <TextField key={invoice.id} label={`${invoice.documentNumber} · Outstanding ${invoice.currency} ${invoice.outstanding}`} value={values.find((entry) => entry.invoiceId === invoice.id)?.amount ?? ''} inputProps={{ inputMode: 'decimal', pattern: '[0-9]+(\\.[0-9]{1,3})?' }} onChange={(event) => setAmount(invoice.id, event.target.value)} />)}
    {query.data && query.data.pagination.total === 0 ? <Typography>No outstanding invoices in this currency.</Typography> : null}
    {query.data && query.data.pagination.totalPages > 1 ? <Stack direction="row" spacing={2}><AppButton disabled={page === 1} onClick={() => setPage(page - 1)}>Previous invoices</AppButton><Typography>Page {page} of {query.data.pagination.totalPages}</Typography><AppButton disabled={page >= query.data.pagination.totalPages} onClick={() => setPage(page + 1)}>Next invoices</AppButton></Stack> : null}
    {values.length ? <Typography>{values.length} invoice allocation(s) selected, including other pages.</Typography> : null}
  </Stack>;
}
