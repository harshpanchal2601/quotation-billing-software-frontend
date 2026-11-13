import { Link as MuiLink, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { PERMISSIONS, useHasPermission } from '@features/auth';
import { toApiError } from '@shared/api/apiClient';
import { ErrorState } from '@shared/components/common/ErrorState';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { AppButton } from '@shared/ui/actions';
import { AppStatusChip } from '@shared/ui/display';
import { DetailFields, DetailSection } from '@shared/ui/layout';
import { RecordTable } from '@shared/ui/tables';
import { getInvoiceSettlement } from './payments.api';
import { paymentsKeys } from './payments.queries';

export function InvoiceSettlementPanel({ invoiceId }: { invoiceId: number }) {
  const canView = useHasPermission(PERMISSIONS.PAYMENTS_VIEW);
  return canView ? <Settlement invoiceId={invoiceId} /> : null;
}
function Settlement({ invoiceId }: { invoiceId: number }) {
  const firmId = useFirmId(); const canRecord = useHasPermission(PERMISSIONS.PAYMENTS_RECORD);
  const query = useQuery({ queryKey: [...paymentsKeys.firm(firmId), 'invoice', invoiceId], queryFn: ({ signal }) => getInvoiceSettlement(invoiceId, signal), enabled: firmId != null });
  if (query.isError) return <ErrorState message={toApiError(query.error).message} onRetry={() => void query.refetch()} />;
  if (!query.data) return <Typography role="status">Loading payment summary…</Typography>;
  const balance = query.data;
  return <DetailSection title="Invoice payments" description={`All amounts in ${balance.currency}.`} actions={<AppStatusChip label={`${balance.settlementStatus === 'PAID' ? 'Paid' : balance.settlementStatus === 'PARTIAL' ? 'Partially paid' : 'Unpaid'}${balance.overdue ? ' · Past due' : ''}`} variant={balance.overdue ? 'error' : balance.settlementStatus === 'PAID' ? 'success' : 'warning'} />}>
    <DetailFields fields={[
      { label: 'Total after credit / debit notes', value: `${balance.currency} ${balance.adjustedTotal}` }, { label: 'Payments applied', value: balance.allocated }, { label: 'Amount due', value: balance.outstanding },
    ]} />
    <RecordTable rows={balance.allocations} label="Invoice receipt allocations" rowKey={(entry) => entry.id} emptyMessage="No receipts allocated to this invoice." columns={[
      { key: 'receipt', label: 'Receipt', sortValue: (entry) => entry.reference, render: (entry) => <MuiLink component={Link} to={`/payments/${entry.paymentId}`}>{entry.reference || `Receipt #${entry.paymentId}`}</MuiLink> },
      { key: 'amount', label: 'Amount', align: 'right', sortValue: (entry) => entry.amount, render: (entry) => entry.amount },
      { key: 'status', label: 'Status', sortValue: (entry) => entry.active ? 1 : 0, render: (entry) => <AppStatusChip label={entry.active ? 'Applied' : 'Undone'} variant={entry.active ? 'success' : 'warning'} /> },
      { key: 'recorded', label: 'Recorded at', sortValue: (entry) => new Date(entry.createdAt).getTime(), render: (entry) => new Date(entry.createdAt).toLocaleString() },
    ]} />
    {canRecord ? <AppButton variant="outlined" component={Link} to={`/payments?companyId=${balance.companyId}&currency=${balance.currency}`} sx={{ alignSelf: 'flex-start' }}>Record or allocate a customer receipt</AppButton> : null}
  </DetailSection>;
}
