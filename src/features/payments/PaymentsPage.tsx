import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PERMISSIONS, useHasPermission } from '@features/auth';
import { toApiError } from '@shared/api/apiClient';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { AppButton } from '@shared/ui/actions';
import { PageContainer, PageHeader } from '@shared/ui/layout';
import { getPaymentCapabilities, listPayments } from './payments.api';
import { paymentsKeys, paymentCurrencies } from './payments.queries';
import { ReceiptForm } from './ReceiptForm';

export function PaymentsPage() {
  const firmId = useFirmId();
  return <PaymentsList key={firmId} />;
}
function PaymentsList() {
  const firmId = useFirmId(); const navigate = useNavigate(); const [params] = useSearchParams();
  const companyId = Number(params.get('companyId')) || undefined;
  const currency = params.get('currency') ?? 'INR';
  const [page, setPage] = useState(1); const [search, setSearch] = useState(''); const [open, setOpen] = useState(false);
  const canRecord = useHasPermission(PERMISSIONS.PAYMENTS_RECORD);
  const queryParams = { page, limit: 20, search, ...(companyId ? { companyId } : {}) };
  const query = useQuery({ queryKey: [...paymentsKeys.firm(firmId), 'list', queryParams], queryFn: ({ signal }) => listPayments(queryParams, signal), enabled: firmId != null });
  const capabilities = useQuery({ queryKey: [...paymentsKeys.firm(firmId), 'capabilities'], queryFn: ({ signal }) => getPaymentCapabilities(signal), enabled: firmId != null });
  return <PageContainer><PageHeader title="Customer payments" description="Confirmed receipts, explicit allocations and customer credit" actions={canRecord ? <AppButton variant="contained" onClick={() => setOpen(true)}>Record receipt</AppButton> : undefined} />
    <TextField label="Search customer or receipt reference" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
    {companyId ? <Typography>Customer #{companyId} · <Link to="/payments">Show all customers</Link></Typography> : null}
    {query.isError ? <Alert severity="error">{toApiError(query.error).message}</Alert> : null}
    {query.isPending ? <Typography>Loading receipts…</Typography> : null}
    <Stack sx={{ overflowX: 'auto' }}><Table aria-label="Customer receipts"><TableHead><TableRow>{['Receipt', 'Customer', 'Received', 'Amount', 'Allocated', 'Unapplied', 'Status'].map((label) => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead><TableBody>{query.data?.payments.map((payment) => <TableRow key={payment.id}><TableCell><Link to={`/payments/${payment.id}`}>{payment.reference || `Receipt #${payment.id}`}</Link></TableCell><TableCell>{payment.companyName}</TableCell><TableCell>{payment.receivedDate}</TableCell><TableCell>{payment.currency} {payment.amount}</TableCell><TableCell>{payment.currency} {payment.allocated}</TableCell><TableCell>{payment.currency} {payment.unapplied}</TableCell><TableCell>{payment.status}</TableCell></TableRow>)}</TableBody></Table></Stack>
    {query.data?.pagination.total === 0 ? <Typography>No receipts found.</Typography> : null}
    <Stack direction="row" spacing={2}><AppButton disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</AppButton><Typography>Page {page}</Typography><AppButton disabled={!query.data || page >= query.data.pagination.totalPages} onClick={() => setPage(page + 1)}>Next</AppButton></Stack>
    {capabilities.data ? <><Alert severity="info">Payment links: {capabilities.data.paymentLinks.reason}.</Alert><Alert severity="info">Reminder delivery: {capabilities.data.reminders.reason}.</Alert></> : null}
    <Dialog open={open && canRecord} onClose={() => setOpen(false)} fullWidth maxWidth="sm"><DialogTitle>Record confirmed receipt</DialogTitle><DialogContent><ReceiptForm key={`${firmId}:${open}`} companyId={companyId} currency={paymentCurrencies.includes(currency as typeof paymentCurrencies[number]) ? currency : 'INR'} onSaved={(payment) => { setOpen(false); navigate(`/payments/${payment.id}`); }} /></DialogContent><DialogActions><AppButton onClick={() => setOpen(false)}>Close</AppButton></DialogActions></Dialog>
  </PageContainer>;
}
