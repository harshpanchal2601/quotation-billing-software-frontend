import { Alert, Dialog, DialogContent, DialogTitle, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { PERMISSIONS, useHasPermission } from '@features/auth';
import { OrderInvoiceConversion } from '@features/invoices';
import { toApiError } from '@shared/api/apiClient';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { AppButton } from '@shared/ui/actions';
import { PageContainer, PageHeader } from '@shared/ui/layout';
import { cancelSalesRecord, getSalesOrder, recordFulfillment, salesOrderKeys, type SalesOrder } from './sales-orders.api';

export function SalesOrderDetailsPage() {
  const firmId = useFirmId(); const id = Number(useParams().id);
  const [params, setParams] = useSearchParams(); const historyPage = Math.max(1, Math.min(100000, Number(params.get('historyPage')) || 1));
  const query = useQuery({ queryKey: [...salesOrderKeys.firm(firmId), 'detail', id, historyPage], queryFn: ({ signal }) => getSalesOrder(id, signal, historyPage), enabled: firmId != null && Number.isSafeInteger(id) && id > 0 });
  if (!Number.isSafeInteger(id) || id < 1) return <Alert severity="error">Invalid order ID</Alert>;
  if (query.isPending) return <Typography>Loading order…</Typography>;
  if (query.isError) return <Alert severity="error">{toApiError(query.error).message}</Alert>;
  return <OrderDetails key={`${firmId}:${id}:${query.data.version}`} order={query.data} historyPage={historyPage} changeHistory={(page) => setParams({ historyPage: String(page) })} />;
}
function OrderDetails({ order, historyPage, changeHistory }: { order: SalesOrder; historyPage: number; changeHistory: (page: number) => void }) {
  const firmId = useFirmId(); const cache = useQueryClient(); const canFulfill = useHasPermission(PERMISSIONS.FULFILLMENTS_MANAGE); const canManage = useHasPermission(PERMISSIONS.SALES_ORDERS_MANAGE); const canInvoice = useHasPermission(PERMISSIONS.INVOICES_CREATE);
  const [key] = useState(() => crypto.randomUUID()); const [occurredAt] = useState(() => new Date().toISOString()); const [invoice, setInvoice] = useState(false); const [cancel, setCancel] = useState<{ kind: 'sales-orders' | 'fulfillments'; id: number } | null>(null);
  const mutation = useMutation({ mutationFn: (action: () => Promise<unknown>) => action(), onSuccess: () => cache.invalidateQueries({ queryKey: salesOrderKeys.firm(firmId) }) });
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const lines = order.lines.flatMap((line) => { const quantity = String(data.get(`quantity_${line.id}`) ?? '').trim(); return quantity && /[1-9]/.test(quantity) ? [{ salesOrderLineId: line.id, quantity }] : []; }); mutation.mutate(() => recordFulfillment({ salesOrderId: order.id, expectedVersion: order.version, idempotencyKey: key, reference: String(data.get('reference')), occurredAt, lines })); }
  return <PageContainer><PageHeader title={order.orderNumber} description={`${order.status} · Version ${order.version}`} actions={<AppButton component={Link} to="/sales-orders">All orders</AppButton>} />
    {mutation.isError ? <Alert severity="error">{toApiError(mutation.error).message}</Alert> : null}
    <Typography>{order.snapshot.companyName} · Accepted quotation <Link to={`/quotations/${order.sourceQuotationId}`}>#{order.sourceQuotationId}</Link> · Exact revision {order.snapshot.revisionNumber}</Typography>
    <Typography>Accepted total {order.currency} {order.snapshot.grandTotal}</Typography>
    <Table aria-label="Order line quantities"><TableHead><TableRow>{['Line', 'Item / service', 'Ordered', 'Completed', 'Reserved / invoiced', 'Available to invoice'].map((label) => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead><TableBody>{order.lines.map((line) => <TableRow key={line.id}><TableCell>{line.lineNumber}</TableCell><TableCell>{line.snapshot.itemName}</TableCell><TableCell>{line.quantity} {line.snapshot.measurementUnit}</TableCell><TableCell>{line.fulfilled}</TableCell><TableCell>{line.reserved}</TableCell><TableCell>{line.available}</TableCell></TableRow>)}</TableBody></Table>
    {order.status !== 'CANCELLED' && canFulfill ? <Stack component="form" onSubmit={submit} spacing={2}><Typography variant="h6">Record delivery / service completion</Typography><TextField name="reference" label="Dispatch / completion reference" required inputProps={{ maxLength: 191 }} />{order.lines.map((line) => <TextField key={line.id} name={`quantity_${line.id}`} label={`Completed quantity: ${line.snapshot.itemName}`} inputProps={{ inputMode: 'decimal', pattern: '\\d+(\\.\\d{1,3})?' }} helperText={`${line.quantity} ordered; ${line.fulfilled} already completed`} />)}<AppButton type="submit" disabled={mutation.isPending}>Record completion</AppButton></Stack> : null}
    <Stack direction="row">{canInvoice && order.status !== 'CANCELLED' ? <AppButton onClick={() => setInvoice(true)}>Invoice completed quantities</AppButton> : null}{canManage && order.status !== 'CANCELLED' ? <AppButton onClick={() => setCancel({ kind: 'sales-orders', id: order.id })}>Cancel order</AppButton> : null}</Stack>
    <Typography variant="h6">Completion history</Typography>{order.fulfillments.map((row) => <Stack key={row.id} direction="row" spacing={2}><Typography>{row.reference} · {new Date(row.occurredAt).toLocaleString()} · {row.cancelledAt ? `Cancelled: ${row.cancellationReason}` : 'Recorded'} · {row.lines.map((line) => `Line #${line.salesOrderLineId}: ${line.quantity}`).join(', ')}</Typography>{canFulfill && !row.cancelledAt ? <AppButton onClick={() => setCancel({ kind: 'fulfillments', id: row.id })}>Cancel completion</AppButton> : null}</Stack>)}
    <Typography variant="h6">Linked invoices</Typography>{order.invoices.map((row) => <Typography key={row.id}><Link to={`/invoices/${row.id}`}>{row.documentNumber ?? `Draft #${row.id}`}</Link> · {row.status}</Typography>)}
    <Typography variant="h6">Order status history</Typography>{order.history.map((row) => <Typography key={row.id}>v{row.version} · {row.status} · {row.reason} · Actor #{row.actorId} · {new Date(row.createdAt).toLocaleString()}</Typography>)}
    {order.snapshot.paymentTerms ? <Typography sx={{ whiteSpace: 'pre-wrap' }}>{order.snapshot.paymentTerms}</Typography> : null}{order.snapshot.termsAndConditions ? <Typography sx={{ whiteSpace: 'pre-wrap' }}>{order.snapshot.termsAndConditions}</Typography> : null}
    <Stack direction="row"><AppButton disabled={historyPage === 1} onClick={() => changeHistory(historyPage - 1)}>Newer order history</AppButton><Typography>History page {historyPage}</Typography><AppButton disabled={!order.historyPagination?.hasMore} onClick={() => changeHistory(historyPage + 1)}>Older order history</AppButton></Stack>
    {invoice ? <OrderInvoiceConversion order={order} onClose={() => setInvoice(false)} /> : null}
    <Dialog open={cancel !== null} onClose={() => setCancel(null)} fullWidth><DialogTitle>Cancel {cancel?.kind === 'fulfillments' ? 'completion' : 'order'}</DialogTitle><DialogContent><Stack component="form" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (cancel) { const reason = String(new FormData(event.currentTarget).get('reason')); mutation.mutate(() => cancelSalesRecord(cancel.kind, cancel.id, order.version, reason)); } }} spacing={2} sx={{ pt: 1 }}><TextField name="reason" label="Reason" required inputProps={{ minLength: 5, maxLength: 2000 }} /><AppButton type="submit" disabled={mutation.isPending}>Confirm cancellation</AppButton></Stack></DialogContent></Dialog>
  </PageContainer>;
}
