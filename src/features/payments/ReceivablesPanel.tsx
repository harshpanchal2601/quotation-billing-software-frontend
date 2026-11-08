import { Alert, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PERMISSIONS, useHasPermission } from '@features/auth';
import { toApiError } from '@shared/api/apiClient';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { AppButton } from '@shared/ui/actions';
import { PageContainer, PageHeader } from '@shared/ui/layout';
import { getReceivables } from './payments.api';
import { paymentsKeys } from './payments.queries';

export function ReceivablesPage() { return <PageContainer><PageHeader title="Receivables and ageing" description="Outstanding invoices and unapplied customer credit, separated by currency" /><ReceivablesPanel /></PageContainer>; }
export function ReceivablesPanel({ companyId, compact = false }: { companyId?: number; compact?: boolean }) {
  const firmId = useFirmId(); const canView = useHasPermission(PERMISSIONS.PAYMENTS_VIEW);
  return canView ? <Balances key={`${firmId}:${companyId}`} companyId={companyId} compact={compact} /> : null;
}
function Balances({ companyId, compact }: { companyId?: number; compact: boolean }) {
  const firmId = useFirmId(); const [page, setPage] = useState(1);
  const canViewInvoices = useHasPermission(PERMISSIONS.INVOICES_VIEW);
  const params = { page, limit: compact ? 1 : 20, ...(companyId ? { companyId } : {}) };
  const query = useQuery({ queryKey: paymentsKeys.receivables(firmId, params), queryFn: ({ signal }) => getReceivables(params, signal), enabled: firmId != null });
  if (query.isError) return <Alert severity="error">{toApiError(query.error).message}</Alert>;
  if (!query.data) return <Typography>Loading receivables…</Typography>;
  return <Stack spacing={2}><Typography variant="h6">{companyId ? 'Customer balance' : 'Receivables'} · {query.data.asOf} ({query.data.timezone})</Typography>
    {query.data.buckets.length === 0 ? <Typography>No outstanding invoices.</Typography> : query.data.buckets.map((bucket) => <Typography key={`${bucket.currency}:${bucket.bucket}`}>{bucket.currency} {bucket.amount} · {bucket.bucket.replace(/_/g, ' ')} · {bucket.count} invoice(s)</Typography>)}
    {query.data.customerCredits.map((credit) => <Typography key={credit.currency}>Unapplied credit: {credit.currency} {credit.unapplied}</Typography>)}
    <AppButton component={Link} to={compact ? '/receivables' : companyId ? `/payments?companyId=${companyId}` : '/payments'}>{compact ? 'View receivables' : 'View customer receipts'}</AppButton>
    {!compact ? <><Stack sx={{ overflowX: 'auto' }}><Table aria-label="Outstanding invoices"><TableHead><TableRow>{['Invoice', 'Customer', 'Due', 'Outstanding', 'Settlement'].map((label) => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead><TableBody>{query.data.receivables.map((invoice) => <TableRow key={invoice.id}><TableCell>{canViewInvoices ? <Link to={`/invoices/${invoice.id}`}>{invoice.documentNumber}</Link> : invoice.documentNumber}</TableCell><TableCell>{invoice.companyName}</TableCell><TableCell>{invoice.dueDate || 'No due date'}</TableCell><TableCell>{invoice.currency} {invoice.outstanding}</TableCell><TableCell>{invoice.settlementStatus}{invoice.overdue ? ' · Past due' : ''}</TableCell></TableRow>)}</TableBody></Table></Stack>
      <Stack direction="row" spacing={2}><AppButton disabled={page === 1} onClick={() => setPage(page - 1)}>Previous invoices</AppButton><Typography>Page {page}</Typography><AppButton disabled={page >= query.data.pagination.totalPages} onClick={() => setPage(page + 1)}>Next invoices</AppButton></Stack></> : null}
  </Stack>;
}
