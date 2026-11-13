import { Alert, Link as MuiLink, TextField, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PERMISSIONS, useHasPermission } from '@features/auth';
import { toApiError } from '@shared/api/apiClient';
import { ErrorState } from '@shared/components/common/ErrorState';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { AppButton } from '@shared/ui/actions';
import { formatRecordStatus } from '@shared/ui/display';
import { RecordPagination, RecordTable, useTableSort } from '@shared/ui/tables';
import { PageContainer, PageHeader } from '@shared/ui/layout';
import { getPaymentCapabilities, listPayments } from './payments.api';
import { paymentsKeys, paymentCurrencies } from './payments.queries';
import { ReceiptForm } from './ReceiptForm';

export function PaymentsPage() {
  const firmId = useFirmId();
  return <PaymentsList key={firmId} />;
}
function PaymentsList() {
  const firmId = useFirmId(); const [params] = useSearchParams();
  const companyId = Number(params.get('companyId')) || undefined;
  const currency = params.get('currency') ?? 'INR';
  const [page, setPage] = useState(1); const [search, setSearch] = useState(''); const [open, setOpen] = useState(false);
  const canRecord = useHasPermission(PERMISSIONS.PAYMENTS_RECORD);
  const sorting = useTableSort([{ key: 'id', label: 'Record number' }, { key: 'reference', label: 'Receipt reference' }, { key: 'receivedDate', label: 'Received date' }, { key: 'amount', label: 'Receipt amount' }, { key: 'currency', label: 'Currency' }], { onChange: () => setPage(1) });
  const queryParams = { page, limit: 20, search, sortBy: sorting.sortBy, sortOrder: sorting.sortOrder, ...(companyId ? { companyId } : {}) };
  const query = useQuery({ queryKey: [...paymentsKeys.firm(firmId), 'list', queryParams], queryFn: ({ signal }) => listPayments(queryParams, signal), enabled: firmId != null });
  const capabilities = useQuery({ queryKey: [...paymentsKeys.firm(firmId), 'capabilities'], queryFn: ({ signal }) => getPaymentCapabilities(signal), enabled: firmId != null });
  return <PageContainer><PageHeader title="Customer payments" description="Record customer payments, apply them to invoices and track available credit" actions={canRecord ? <AppButton variant="contained" onClick={() => setOpen(true)}>Record receipt</AppButton> : undefined} />
    <TextField label="Search customer or receipt reference" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
    {companyId ? <Typography>Customer #{companyId} · <MuiLink component={Link} to="/payments">Show all customers</MuiLink></Typography> : null}
    {query.isError ? <ErrorState message={toApiError(query.error).message} onRetry={() => void query.refetch()} /> : null}
    {query.isPending ? <Typography>Loading receipts…</Typography> : null}
    {query.data ? <><RecordTable rows={query.data.payments} sorting={sorting} rowNumberStart={(page - 1) * 20 + 1} label="Customer receipts" rowKey={(payment) => payment.id} emptyMessage="No receipts match these filters." columns={[
      { key: 'reference', sortKey: 'reference', label: 'Receipt', render: (payment) => <MuiLink component={Link} to={`/payments/${payment.id}`}>{payment.reference || `Receipt #${payment.id}`}</MuiLink> },
      { key: 'customer', label: 'Customer', render: (payment) => payment.companyName }, { key: 'receivedDate', sortKey: 'receivedDate', label: 'Received', render: (payment) => payment.receivedDate },
      { key: 'amount', sortKey: 'amount', label: 'Amount', align: 'right', render: (payment) => `${payment.currency} ${payment.amount}` }, { key: 'allocated', label: 'Applied to invoices', align: 'right', render: (payment) => `${payment.currency} ${payment.allocated}` }, { key: 'unapplied', label: 'Available credit', align: 'right', render: (payment) => `${payment.currency} ${payment.unapplied}` },
      { key: 'status', label: 'Status', render: (payment) => formatRecordStatus(payment.status) },
    ]} /><RecordPagination pagination={query.data.pagination} page={page} change={setPage} /></> : null}
    {capabilities.data ? <><Alert severity="info">Payment links: {capabilities.data.paymentLinks.reason}.</Alert><Alert severity="info">Reminder delivery: {capabilities.data.reminders.reason}.</Alert></> : null}
    {open && canRecord ? <ReceiptForm key={`${firmId}:receipt`} companyId={companyId} currency={paymentCurrencies.includes(currency as typeof paymentCurrencies[number]) ? currency : 'INR'} onClose={() => setOpen(false)} onSaved={() => setOpen(false)} /> : null}
  </PageContainer>;
}
