import { Alert, Box, Checkbox, Link as MuiLink, FormControlLabel, TextField, Typography } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PERMISSIONS, useHasPermission } from '@features/auth';
import { toApiError } from '@shared/api/apiClient';
import { ErrorState } from '@shared/components/common/ErrorState';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { AppButton } from '@shared/ui/actions';
import { AmountSummary, DetailActions, DetailFields, DetailSection, DetailHeader, PageContainer } from '@shared/ui/layout';
import { RecordTable } from '@shared/ui/tables';
import { AppStatusChip } from '@shared/ui/display';
import { CommandForm } from '@shared/forms/CommandForm';
import { AllocationFields } from './AllocationFields';
import { allocatePayment, getPayment, refundPayment, reversePayment } from './payments.api';
import { billingDateToday, paymentsKeys } from './payments.queries';
import type { Allocation, Payment } from './payments.types';

type Action = 'allocate' | 'reverse' | 'refund';
export function PaymentDetailsPage() {
  const id = Number(useParams().id); const firmId = useFirmId();
  const query = useQuery({ queryKey: paymentsKeys.detail(firmId, id), queryFn: ({ signal }) => getPayment(id, signal), enabled: firmId != null && Number.isSafeInteger(id) && id > 0 });
  if (!Number.isSafeInteger(id) || id <= 0) return <Alert severity="error">Invalid receipt ID</Alert>;
  if (query.isError) return <ErrorState message={toApiError(query.error).message} onRetry={() => void query.refetch()} />;
  if (!query.data) return <Typography>Loading receipt…</Typography>;
  return <PaymentDetails key={`${firmId}:${id}`} payment={query.data} />;
}
function PaymentDetails({ payment }: { payment: Payment }) {
  const canRecord = useHasPermission(PERMISSIONS.PAYMENTS_RECORD); const canManage = useHasPermission(PERMISSIONS.PAYMENTS_MANAGE);
  const canViewInvoices = useHasPermission(PERMISSIONS.INVOICES_VIEW);
  const [action, setAction] = useState<Action | null>(null);
  // Ledger projections are nonnegative decimal strings; avoid rounding through Number.
  const hasUnappliedCredit = /[1-9]/.test(payment.unapplied);
  const hasNetReceipt = /[1-9]/.test(payment.netAmount);
  return <PageContainer><DetailHeader title={`Receipt #${payment.id}`} description={payment.companyName} status={<AppStatusChip label={payment.status === 'RECORDED' ? 'Recorded' : 'Cancelled'} variant={payment.status === 'RECORDED' ? 'success' : 'warning'} size="medium" />} backAction={<AppButton size="small" color="inherit" component={Link} to="/payments">All receipts</AppButton>} />
    {payment.status === 'RECORDED' && (canRecord || canManage) ? <DetailActions label="Receipt actions">
      {canRecord ? <AppButton variant="contained" disabled={!hasUnappliedCredit} onClick={() => setAction('allocate')}>Apply receipt to invoices</AppButton> : null}
      {canManage ? <><AppButton variant="outlined" disabled={!hasUnappliedCredit} onClick={() => setAction('refund')}>Record refund already paid</AppButton><AppButton color="error" disabled={!hasNetReceipt} onClick={() => setAction('reverse')}>Cancel remaining receipt</AppButton></> : null}
      {!hasUnappliedCredit ? <Typography variant="body2" color="text.secondary" sx={{ flexBasis: '100%' }}>This receipt has no available customer credit to apply to another invoice or refund.</Typography> : null}
    </DetailActions> : null}
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) minmax(300px, 0.75fr)' }, gap: 3, alignItems: 'start' }}>
      <DetailSection title="Receipt details"><DetailFields fields={[
        { label: 'Customer', value: payment.companyName }, { label: 'Received date', value: payment.receivedDate },
        { label: 'Method', value: payment.method.replace(/_/g, ' ').toLowerCase().replace(/^./, (letter) => letter.toUpperCase()) }, { label: 'Reference', value: payment.reference || 'Not specified' },
        { label: 'Recorded by', value: `User #${payment.createdById}` }, { label: 'Recorded at', value: new Date(payment.createdAt).toLocaleString() },
      ]} /></DetailSection>
      <DetailSection title="Receipt balance"><AmountSummary rows={[
        { label: 'Received', value: `${payment.currency} ${payment.amount}` }, { label: 'Refunded', value: payment.refunded },
        { label: 'Cancelled amount', value: payment.reversed }, { label: 'Net receipt', value: payment.netAmount }, { label: 'Applied to invoices', value: payment.allocated },
        { label: 'Available customer credit', value: `${payment.currency} ${payment.unapplied}`, emphasis: true },
      ]} /></DetailSection>
    </Box>
    <DetailSection title="Allocation history" description={`All amounts in ${payment.currency}.`}><RecordTable rows={payment.allocations} label="Receipt allocation history" rowKey={(entry) => entry.id} emptyMessage="No invoice allocations were recorded for this receipt." columns={[
      { key: 'invoice', label: 'Invoice', sortValue: (entry) => entry.documentNumber, render: (entry) => canViewInvoices ? <MuiLink component={Link} to={`/invoices/${entry.invoiceId}`}>{entry.documentNumber || `Invoice #${entry.invoiceId}`}</MuiLink> : entry.documentNumber || `Invoice #${entry.invoiceId}` },
      { key: 'amount', label: 'Amount', align: 'right', sortValue: (entry) => entry.amount, render: (entry) => entry.amount },
      { key: 'status', label: 'Status', sortValue: (entry) => entry.active ? 1 : 0, render: (entry) => <AppStatusChip label={entry.active ? 'Applied' : 'Undone'} variant={entry.active ? 'success' : 'warning'} /> },
      { key: 'actor', label: 'Recorded by', sortValue: (entry) => entry.createdById, render: (entry) => `#${entry.createdById}` },
      { key: 'date', label: 'Recorded at', sortValue: (entry) => new Date(entry.createdAt).getTime(), render: (entry) => new Date(entry.createdAt).toLocaleString() },
    ]} /></DetailSection>
    <DetailSection title="Refund history" description={`All amounts in ${payment.currency}.`}><RecordTable rows={payment.refunds} label="Receipt refund history" rowKey={(entry) => entry.id} emptyMessage="No refunds recorded." columns={[
      { key: 'paid', label: 'Paid date', sortValue: (entry) => entry.paidDate, render: (entry) => entry.paidDate },
      { key: 'amount', label: 'Amount', align: 'right', sortValue: (entry) => entry.amount, render: (entry) => entry.amount },
      { key: 'reference', label: 'Reference', sortValue: (entry) => entry.reference, render: (entry) => entry.reference },
      { key: 'reason', label: 'Reason', sortValue: (entry) => entry.reason, render: (entry) => entry.reason },
      { key: 'actor', label: 'Recorded by', sortValue: (entry) => entry.createdById, render: (entry) => `#${entry.createdById}` },
      { key: 'date', label: 'Recorded at', sortValue: (entry) => new Date(entry.createdAt).getTime(), render: (entry) => new Date(entry.createdAt).toLocaleString() },
    ]} /></DetailSection>
    {payment.reversal ? <Alert severity="warning">Cancelled {payment.currency} {payment.reversal.amount}: {payment.reversal.reason} · User #{payment.reversal.createdById} · {new Date(payment.reversal.createdAt).toLocaleString()}. Original allocations and refund history are preserved.</Alert> : null}
    {action ? <PaymentCommand key={action} payment={payment} action={action} onClose={() => setAction(null)} /> : null}
  </PageContainer>;
}

function PaymentCommand({ payment, action, onClose }: { payment: Payment; action: Action; onClose: () => void }) {
  const firmId = useFirmId(); const client = useQueryClient();
  const [reason, setReason] = useState(''); const [amount, setAmount] = useState(''); const [reference, setReference] = useState('');
  const [paidDate, setPaidDate] = useState(billingDateToday); const [confirmed, setConfirmed] = useState(false); const [allocations, setAllocations] = useState<Allocation[]>([]);
  const title = action === 'allocate' ? 'Apply receipt to invoices' : action === 'reverse' ? 'Cancel remaining receipt' : 'Record refund already paid';
  return <CommandForm dialog maxWidth="md" initialOpen hideTrigger title={title} label={action === 'allocate' ? 'Apply receipt' : action === 'reverse' ? 'Cancel remaining receipt' : 'Record refund'} onClosed={onClose} cancelLabel={action === 'reverse' ? 'Keep receipt' : undefined} submitColor={action === 'reverse' ? 'error' : 'primary'}
    successMessage={action === 'allocate' ? 'Receipt applied to invoices.' : action === 'reverse' ? 'Remaining receipt cancelled.' : 'External refund recorded.'}
    isSubmitDisabled={action === 'allocate' ? allocations.length === 0 : !confirmed}
    confirmation={action === 'allocate' ? undefined : { title: `${title}?`, description: action === 'reverse' ? `This cancels the remaining receipt amount of ${payment.currency} ${payment.netAmount}. Amounts applied to invoices are removed, so those invoices may become unpaid. Earlier refunds stay in the history.` : `Record the externally paid refund of ${payment.currency} ${amount}. This updates available customer credit and does not transfer money.`, color: 'warning' }}
    submit={async (_data, key) => {
      if (action === 'allocate') await allocatePayment(payment.id, key, allocations);
      else if (action === 'reverse') await reversePayment(payment.id, key, reason);
      else await refundPayment(payment.id, { idempotencyKey: key, amount, reference, paidDate, reason, confirmed: true });
    }} saved={() => Promise.all([client.invalidateQueries({ queryKey: paymentsKeys.firm(firmId) }, { throwOnError: true }), client.invalidateQueries({ queryKey: ['billing', firmId] }, { throwOnError: true })])}>
    <input type="hidden" name="receiptCommand" value={JSON.stringify({ action, allocations, reason, amount, reference, paidDate, confirmed })} />
    <Alert severity="info">Available customer credit: {payment.currency} {payment.unapplied}</Alert>
    {action === 'allocate' ? <AllocationFields companyId={payment.companyId} currency={payment.currency} values={allocations} onChange={setAllocations} /> : <>
      {action === 'reverse' ? <Alert severity="warning">This cancels the remaining receipt amount of {payment.currency} {payment.netAmount}. Amounts applied to invoices are removed, so those invoices may become unpaid. Earlier refunds stay in the history.</Alert> : <><TextField label="Refund amount" required value={amount} onChange={(event) => setAmount(event.target.value)} inputProps={{ inputMode: 'decimal', pattern: '[0-9]+(\\.[0-9]{1,3})?' }} /><TextField label="Refund reference" required value={reference} inputProps={{ maxLength: 191 }} onChange={(event) => setReference(event.target.value)} /><TextField label="Refund paid date" type="date" required value={paidDate} InputLabelProps={{ shrink: true }} inputProps={{ min: payment.receivedDate, max: billingDateToday() }} onChange={(event) => setPaidDate(event.target.value)} /></>}
      <TextField label="Reason" required multiline value={reason} inputProps={{ minLength: 5, maxLength: 2000 }} onChange={(event) => setReason(event.target.value)} />
      <FormControlLabel control={<Checkbox checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />} label={action === 'refund' ? 'I confirm this refund has already been paid externally.' : 'I confirm the remaining receipt amount should be cancelled.'} />
    </>}
  </CommandForm>;
}
