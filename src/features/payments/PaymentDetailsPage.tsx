import { Alert, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Stack, TextField, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PERMISSIONS, useHasPermission } from '@features/auth';
import { toApiError } from '@shared/api/apiClient';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { AppButton } from '@shared/ui/actions';
import { PageContainer, PageHeader } from '@shared/ui/layout';
import { AllocationFields } from './AllocationFields';
import { allocatePayment, getPayment, refundPayment, reversePayment } from './payments.api';
import { billingDateToday, paymentsKeys } from './payments.queries';
import type { Allocation, Payment } from './payments.types';

type Action = 'allocate' | 'reverse' | 'refund';
export function PaymentDetailsPage() {
  const id = Number(useParams().id); const firmId = useFirmId();
  const query = useQuery({ queryKey: paymentsKeys.detail(firmId, id), queryFn: ({ signal }) => getPayment(id, signal), enabled: firmId != null && Number.isSafeInteger(id) && id > 0 });
  if (!Number.isSafeInteger(id) || id <= 0) return <Alert severity="error">Invalid receipt ID</Alert>;
  if (query.isError) return <Alert severity="error">{toApiError(query.error).message}</Alert>;
  if (!query.data) return <Typography>Loading receipt…</Typography>;
  return <PaymentDetails key={`${firmId}:${id}`} payment={query.data} />;
}
function PaymentDetails({ payment }: { payment: Payment }) {
  const canRecord = useHasPermission(PERMISSIONS.PAYMENTS_RECORD); const canManage = useHasPermission(PERMISSIONS.PAYMENTS_MANAGE);
  const canViewInvoices = useHasPermission(PERMISSIONS.INVOICES_VIEW);
  const [action, setAction] = useState<Action | null>(null);
  return <PageContainer><PageHeader title={`Receipt #${payment.id}`} description={`${payment.companyName} · ${payment.status}`} actions={<AppButton component={Link} to="/payments">All receipts</AppButton>} />
    <Typography>Received {payment.receivedDate} · {payment.method.replace(/_/g, ' ')} · Reference {payment.reference || 'None'}</Typography>
    <Typography variant="h5">Received {payment.currency} {payment.amount}</Typography><Typography>Net {payment.currency} {payment.netAmount} · Allocated {payment.allocated} · Unapplied {payment.unapplied} · Refunded {payment.refunded} · Reversed {payment.reversed}</Typography>
    <Typography>Recorded by actor #{payment.createdById} · {new Date(payment.createdAt).toLocaleString()}</Typography>
    {payment.status === 'RECORDED' ? <Stack direction="row" spacing={2}>
      {canRecord ? <AppButton onClick={() => setAction('allocate')}>Allocate receipt</AppButton> : null}
      {canManage ? <><AppButton color="error" onClick={() => setAction('reverse')}>Reverse remaining receipt</AppButton><AppButton onClick={() => setAction('refund')}>Record external refund</AppButton></> : null}
    </Stack> : null}
    <Typography variant="h6">Allocation history</Typography>
    {payment.allocations.length === 0 ? <Typography>No allocations. Available funds remain customer credit.</Typography> : payment.allocations.map((entry) => <Typography key={entry.id}>{canViewInvoices ? <Link to={`/invoices/${entry.invoiceId}`}>{entry.documentNumber}</Link> : entry.documentNumber} · {payment.currency} {entry.amount} · {entry.active ? 'Active' : 'Restored by reversal'} · Actor #{entry.createdById} · {new Date(entry.createdAt).toLocaleString()}</Typography>)}
    <Typography variant="h6">Refund history</Typography>{payment.refunds.length === 0 ? <Typography>No refunds recorded.</Typography> : payment.refunds.map((entry) => <Typography key={entry.id}>{entry.paidDate} · {payment.currency} {entry.amount} · {entry.reference} · {entry.reason} · Actor #{entry.createdById} · Recorded {new Date(entry.createdAt).toLocaleString()}</Typography>)}
    {payment.reversal ? <Alert severity="warning">Reversed {payment.currency} {payment.reversal.amount}: {payment.reversal.reason} · Actor #{payment.reversal.createdById} · {new Date(payment.reversal.createdAt).toLocaleString()}. Original allocations and refund history are preserved.</Alert> : null}
    {action ? <PaymentCommand key={action} payment={payment} action={action} onClose={() => setAction(null)} /> : null}
  </PageContainer>;
}
function PaymentCommand({ payment, action, onClose }: { payment: Payment; action: Action; onClose: () => void }) {
  const firmId = useFirmId(); const client = useQueryClient();
  const [key] = useState(() => crypto.randomUUID()); const [reason, setReason] = useState(''); const [amount, setAmount] = useState(''); const [reference, setReference] = useState('');
  const [paidDate, setPaidDate] = useState(billingDateToday); const [confirmed, setConfirmed] = useState(false); const [allocations, setAllocations] = useState<Allocation[]>([]);
  const mutation = useMutation({ mutationFn: async () => {
    if (action === 'allocate') return allocatePayment(payment.id, key, allocations);
    if (action === 'reverse') return reversePayment(payment.id, key, reason);
    return refundPayment(payment.id, { idempotencyKey: key, amount, reference, paidDate, reason, confirmed: true });
  }, onSuccess: () => { void client.invalidateQueries({ queryKey: paymentsKeys.firm(firmId) }); void client.invalidateQueries({ queryKey: ['billing', firmId] }); onClose(); } });
  function submit(event: FormEvent) { event.preventDefault(); if (action === 'allocate' || confirmed) mutation.mutate(); }
  return <Dialog open onClose={onClose} fullWidth maxWidth="sm"><Stack component="form" onSubmit={submit}><DialogTitle>{action === 'allocate' ? 'Allocate unapplied receipt' : action === 'reverse' ? 'Reverse remaining receipt' : 'Record confirmed external refund'}</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
    {mutation.isError ? <Alert severity="error">{toApiError(mutation.error).message}</Alert> : null}
    <Typography>Available unapplied funds: {payment.currency} {payment.unapplied}</Typography>
    {action === 'allocate' ? <AllocationFields companyId={payment.companyId} currency={payment.currency} values={allocations} onChange={setAllocations} /> : <>
      {action === 'reverse' ? <Alert severity="warning">This compensates {payment.currency} {payment.netAmount} and restores every active invoice allocation. Recorded refunds remain in history.</Alert> : <><TextField label="Refund amount" required value={amount} onChange={(event) => setAmount(event.target.value)} inputProps={{ inputMode: 'decimal', pattern: '[0-9]+(\\.[0-9]{1,3})?' }} /><TextField label="Refund reference" required value={reference} inputProps={{ maxLength: 191 }} onChange={(event) => setReference(event.target.value)} /><TextField label="Refund paid date" type="date" required value={paidDate} InputLabelProps={{ shrink: true }} inputProps={{ min: payment.receivedDate, max: billingDateToday() }} onChange={(event) => setPaidDate(event.target.value)} /></>}
      <TextField label="Reason" required multiline value={reason} inputProps={{ minLength: 5, maxLength: 2000 }} onChange={(event) => setReason(event.target.value)} />
      <FormControlLabel control={<Checkbox checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />} label={action === 'refund' ? 'I confirm this refund has already been paid externally.' : 'I confirm this receipt must be reversed.'} />
    </>}
  </Stack></DialogContent><DialogActions><AppButton onClick={onClose}>Cancel</AppButton><AppButton type="submit" variant="contained" disabled={action === 'allocate' ? allocations.length === 0 : !confirmed} isLoading={mutation.isPending}>Confirm {action}</AppButton></DialogActions></Stack></Dialog>;
}
