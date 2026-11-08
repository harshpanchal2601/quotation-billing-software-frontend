import { Alert, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { PERMISSIONS, useHasPermission } from '@features/auth';
import { toApiError } from '@shared/api/apiClient';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { AppButton } from '@shared/ui/actions';
import { getInvoiceSettlement } from './payments.api';
import { paymentsKeys } from './payments.queries';

export function InvoiceSettlementPanel({ invoiceId }: { invoiceId: number }) {
  const canView = useHasPermission(PERMISSIONS.PAYMENTS_VIEW);
  return canView ? <Settlement invoiceId={invoiceId} /> : null;
}
function Settlement({ invoiceId }: { invoiceId: number }) {
  const firmId = useFirmId(); const canRecord = useHasPermission(PERMISSIONS.PAYMENTS_RECORD);
  const query = useQuery({ queryKey: [...paymentsKeys.firm(firmId), 'invoice', invoiceId], queryFn: ({ signal }) => getInvoiceSettlement(invoiceId, signal), enabled: firmId != null });
  if (query.isError) return <Alert severity="error">{toApiError(query.error).message}</Alert>;
  if (!query.data) return <Typography>Loading settlement…</Typography>;
  const balance = query.data;
  return <Stack spacing={2}><Typography variant="h6">Invoice settlement · {balance.settlementStatus}{balance.overdue ? ' · Past due' : ''}</Typography>
    <Typography>Adjusted total {balance.currency} {balance.adjustedTotal} · Allocated {balance.allocated} · Outstanding {balance.outstanding}</Typography>
    {balance.allocations.map((entry) => <Typography key={entry.id}><Link to={`/payments/${entry.paymentId}`}>{entry.reference || `Receipt #${entry.paymentId}`}</Link> · {balance.currency} {entry.amount} · {entry.active ? 'Active' : 'Reversed'}</Typography>)}
    {canRecord ? <AppButton component={Link} to={`/payments?companyId=${balance.companyId}&currency=${balance.currency}`}>Record or allocate a customer receipt</AppButton> : null}
  </Stack>;
}
