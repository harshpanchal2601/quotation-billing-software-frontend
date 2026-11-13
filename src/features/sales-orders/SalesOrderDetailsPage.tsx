import { Alert, Stack, TextField, Typography } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { PERMISSIONS, useHasPermission } from '@features/auth';
import { OrderInvoiceConversion } from '@features/invoices';
import { OrderStockPanel, WarehouseField } from '@features/inventory';
import { toApiError } from '@shared/api/apiClient';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { AppButton } from '@shared/ui/actions';
import { AppStatusChip, formatRecordStatus } from '@shared/ui/display';
import { CommandForm } from '@shared/forms/CommandForm';
import { getSafeListReturnPath } from '@shared/routing/returnNavigation';
import { RecordPagination, RecordTable, useTableSort, type TableSorting } from '@shared/ui/tables';
import { DetailActions, DetailFields, DetailHeader, DetailSection, PageContainer } from '@shared/ui/layout';
import { cancelSalesRecord, fulfillmentWarehouses, getSalesOrder, recordFulfillment, salesOrderKeys, type SalesOrder } from './sales-orders.api';

export function SalesOrderDetailsPage() {
  const firmId = useFirmId(); const id = Number(useParams().id);
  const [params, setParams] = useSearchParams();
  const page = (prefix: string) => { const requested = Number(params.get(`${prefix}Page`)); return Number.isSafeInteger(requested) && requested > 0 && requested <= 100000 ? requested : 1; };
  const historyPage = page('history'); const completionPage = page('completion'); const invoicePage = page('invoice');
  const historySort = useTableSort([{ key: 'version', label: 'Version' }, { key: 'status', label: 'Status' }, { key: 'actorId', label: 'Changed by' }, { key: 'createdAt', label: 'Changed date' }], { paramPrefix: 'history' });
  const completionSort = useTableSort([{ key: 'id', label: 'Record number' }, { key: 'reference', label: 'Reference' }, { key: 'occurredAt', label: 'Completed date' }, { key: 'cancelledAt', label: 'Cancellation date' }], { paramPrefix: 'completion' });
  const invoiceSort = useTableSort([{ key: 'id', label: 'Record number' }, { key: 'documentNumber', label: 'Document number' }, { key: 'status', label: 'Status' }], { paramPrefix: 'invoice' });
  const detailParams = { completionPage, invoicePage, historySortBy: historySort.sortBy, historySortOrder: historySort.sortOrder, completionSortBy: completionSort.sortBy, completionSortOrder: completionSort.sortOrder, invoiceSortBy: invoiceSort.sortBy, invoiceSortOrder: invoiceSort.sortOrder };
  const query = useQuery({ queryKey: [...salesOrderKeys.firm(firmId), 'detail', id, historyPage, detailParams], queryFn: ({ signal }) => getSalesOrder(id, signal, historyPage, detailParams), enabled: firmId != null && Number.isSafeInteger(id) && id > 0,
    placeholderData: (previous, previousQuery) => previousQuery != null && firmId != null && previousQuery.queryKey[1] === firmId && previousQuery.queryKey[3] === id ? previous : undefined,
  });
  if (!Number.isSafeInteger(id) || id < 1) return <Alert severity="error">Invalid order ID</Alert>;
  if (query.isPending) return <Typography role="status">Loading order…</Typography>;
  if (query.isError) return <Alert severity="error" action={<AppButton onClick={() => void query.refetch()}>Retry order</AppButton>}>{toApiError(query.error).message}</Alert>;
  return <><OrderDetails key={`${firmId}:${id}:${query.data.version}`} order={query.data} historySort={historySort} completionSort={completionSort} invoiceSort={invoiceSort} changePage={(prefix, value) => setParams((current) => { const next = new URLSearchParams(current); next.set(`${prefix}Page`, String(value)); return next; }, { replace: true })} />{query.isFetching ? <Typography role="status" color="text.secondary">Refreshing order records…</Typography> : null}</>;
}
function OrderDetails({ order, historySort, completionSort, invoiceSort, changePage }: { order: SalesOrder; historySort: TableSorting; completionSort: TableSorting; invoiceSort: TableSorting; changePage: (prefix: string, page: number) => void }) {
  const firmId = useFirmId(); const cache = useQueryClient(); const canFulfill = useHasPermission(PERMISSIONS.FULFILLMENTS_MANAGE); const canManage = useHasPermission(PERMISSIONS.SALES_ORDERS_MANAGE); const canInvoice = useHasPermission(PERMISSIONS.INVOICES_CREATE);
  const location = useLocation(); const returnPath = getSafeListReturnPath(location, '/sales-orders');
  const [occurredAt] = useState(() => new Date().toISOString()); const [invoice, setInvoice] = useState(false);
  const refresh = () => Promise.all([cache.invalidateQueries({ queryKey: salesOrderKeys.firm(firmId) }, { throwOnError: true }), cache.invalidateQueries({ queryKey: ['inventory', firmId] }, { throwOnError: true })]);
  const cancellation = (kind: 'sales-orders' | 'fulfillments', id: number) => <CommandForm dialog title={kind === 'sales-orders' ? 'Cancel order' : `Cancel completion #${id}`} label="Confirm cancellation" cancelLabel={kind === 'sales-orders' ? 'Keep order' : 'Keep completion'} submitColor="error" saved={refresh} successMessage={kind === 'sales-orders' ? 'Sales order cancelled.' : 'Completion cancelled.'} confirmation={{ title: kind === 'sales-orders' ? `Cancel ${order.orderNumber}?` : `Cancel completion #${id}?`, description: kind === 'sales-orders' ? 'This cancels the order and retains its history. The server checks any related commitments.' : 'This reverses the completion and its stock movements, subject to available stock and related invoices.', color: 'warning' }} submit={(data) => cancelSalesRecord(kind, id, order.version, String(data.get('reason')).trim())}><TextField name="reason" label="Reason" required inputProps={{ minLength: 5, maxLength: 2000 }} /></CommandForm>;
  const canCreateInvoice = order.lines.some((line) => /[1-9]/.test(line.available));
  return <PageContainer><DetailHeader title={order.orderNumber} description={`Version ${order.version}`} status={<AppStatusChip label={formatRecordStatus(order.status)} variant={order.status === 'CANCELLED' ? 'error' : order.status === 'FULFILLED' ? 'success' : 'neutral'} size="medium" />} backAction={<AppButton component={Link} to={returnPath} size="small" color="inherit">All orders</AppButton>} />
    <DetailSection title="Order overview"><DetailFields fields={[
      { label: 'Customer', value: order.snapshot.companyName },
      { label: 'Accepted quotation', value: <Link to={`/quotations/${order.sourceQuotationId}`}>{order.snapshot.quotationNumber ?? `Quotation #${order.sourceQuotationId}`}</Link> },
      { label: 'Quotation revision', value: order.snapshot.revisionNumber }, { label: 'Accepted total', value: `${order.currency} ${order.snapshot.grandTotal}` },
    ]} /></DetailSection>
    <DetailSection title="Order lines" description="Only completed quantities can be invoiced. Reserved / invoiced quantities include existing invoice drafts."><RecordTable rows={order.lines} label="Order line quantities" rowKey={(line) => line.id} columns={[
      { key: 'line', label: 'Line', sortValue: (line) => line.lineNumber, render: (line) => line.lineNumber }, { key: 'item', label: 'Item / service', sortValue: (line) => line.snapshot.itemName, render: (line) => line.snapshot.itemName },
      { key: 'ordered', label: 'Ordered', sortValue: (line) => line.quantity, align: 'right', render: (line) => `${line.quantity} ${line.snapshot.measurementUnit}` }, { key: 'completed', label: 'Completed', sortValue: (line) => line.fulfilled, align: 'right', render: (line) => line.fulfilled },
      { key: 'reserved', label: 'Reserved / invoiced', sortValue: (line) => line.reserved, align: 'right', render: (line) => line.reserved }, { key: 'available', label: 'Available to invoice', sortValue: (line) => line.available, align: 'right', render: (line) => line.available },
    ]} /></DetailSection>
    <DetailActions label="Sales order actions">
    {order.status !== 'CANCELLED' && order.status !== 'FULFILLED' && canFulfill ? <CommandForm dialog title="Record delivery / service completion" label="Record completion" saved={refresh} successMessage="Delivery / service completion recorded." confirmation={{ title: 'Record delivery / service completion?', description: 'This records the entered quantities. Tracked goods are dispatched from their selected warehouses.' }} submit={(data, idempotencyKey) => recordFulfillment({ salesOrderId: order.id, expectedVersion: order.version, idempotencyKey, reference: String(data.get('reference')).trim(), occurredAt, lines: order.lines.flatMap((line) => { const quantity = String(data.get(`quantity_${line.id}`) ?? '').trim(); return quantity && /[1-9]/.test(quantity) ? [{ salesOrderLineId: line.id, quantity, ...(line.snapshot.stockTracking ? { warehouseId: Number(data.get(`warehouse_${line.id}`)) } : {}) }] : []; }) })}>
      <TextField name="reference" label="Dispatch / completion reference" required inputProps={{ maxLength: 191 }} />
      {order.lines.map((line) => <Stack key={line.id} spacing={1}>{line.snapshot.stockTracking ? <WarehouseField name={`warehouse_${line.id}`} label={`Dispatch warehouse: ${line.snapshot.itemName}`} context="fulfillment" load={(search, signal) => fulfillmentWarehouses(signal, search)} required /> : null}<TextField name={`quantity_${line.id}`} label={`Completed quantity: ${line.snapshot.itemName}`} inputProps={{ inputMode: 'decimal', pattern: '\\d+(\\.\\d{1,3})?' }} helperText={`${line.quantity} ordered; ${line.fulfilled} already completed`} /></Stack>)}
    </CommandForm> : null}
    {canInvoice && order.status !== 'CANCELLED' ? <AppButton disabled={!canCreateInvoice} onClick={() => setInvoice(true)}>Invoice completed quantities</AppButton> : null}{canManage && order.status !== 'CANCELLED' ? cancellation('sales-orders', order.id) : null}
    </DetailActions>
    {canInvoice && order.status !== 'CANCELLED' && !canCreateInvoice ? <Typography color="text.secondary">No completed quantities are available to invoice. Only completed quantities that are not already reserved by invoice drafts can be invoiced.</Typography> : null}
    <OrderStockPanel order={order} />
    <DetailSection title="Completion history"><RecordTable rows={order.fulfillments} sorting={completionSort} rowNumberStart={(order.pagination.completions.page - 1) * 20 + 1} label="Completion history" rowKey={(row) => row.id} emptyMessage="No deliveries or service completions recorded." columns={[
      { key: 'reference', sortKey: 'reference', label: 'Reference', render: (row) => row.reference }, { key: 'date', sortKey: 'occurredAt', label: 'Completed at', noWrap: true, render: (row) => new Date(row.occurredAt).toLocaleString() }, { key: 'status', label: 'Status', render: (row) => row.cancelledAt ? `Cancelled: ${row.cancellationReason}` : 'Recorded' },
      { key: 'lines', label: 'Quantities', render: (row) => row.lines.map((line) => { const source = order.lines.find((entry) => entry.id === line.salesOrderLineId); return `${source?.snapshot.itemName ?? `Line #${line.salesOrderLineId}`}: ${line.quantity}${source ? ` ${source.snapshot.measurementUnit}` : ''}`; }).join(', ') }, { key: 'actions', label: 'Actions', render: (row) => canFulfill && !row.cancelledAt ? cancellation('fulfillments', row.id) : '—' },
    ]} />
    <RecordPagination pagination={order.pagination.completions} page={order.pagination.completions.page} change={(value) => changePage('completion', value)} /></DetailSection>
    <DetailSection title="Linked invoices"><RecordTable rows={order.invoices} sorting={invoiceSort} rowNumberStart={(order.pagination.invoices.page - 1) * 20 + 1} label="Linked invoices" rowKey={(row) => row.id} emptyMessage="No invoices linked to this order." columns={[{ key: 'document', sortKey: 'documentNumber', label: 'Document', render: (row) => <Link to={`/invoices/${row.id}`}>{row.documentNumber ?? `Draft #${row.id}`}</Link> }, { key: 'status', sortKey: 'status', label: 'Status', render: (row) => formatRecordStatus(row.status) }]} /><RecordPagination pagination={order.pagination.invoices} page={order.pagination.invoices.page} change={(value) => changePage('invoice', value)} /></DetailSection>
    <DetailSection title="Order status history"><RecordTable rows={order.history} sorting={historySort} rowNumberStart={(order.pagination.history.page - 1) * 20 + 1} label="Order status history" rowKey={(row) => row.id} columns={[{ key: 'version', sortKey: 'version', label: 'Version', align: 'right', render: (row) => row.version }, { key: 'status', sortKey: 'status', label: 'Status', noWrap: true, render: (row) => formatRecordStatus(row.status) }, { key: 'reason', label: 'Reason', render: (row) => row.reason }, { key: 'actor', sortKey: 'actorId', label: 'Changed by', noWrap: true, render: (row) => `#${row.actorId}` }, { key: 'date', sortKey: 'createdAt', label: 'Changed at', noWrap: true, render: (row) => new Date(row.createdAt).toLocaleString() }]} /><RecordPagination pagination={order.pagination.history} page={order.pagination.history.page} change={(value) => changePage('history', value)} /></DetailSection>
    {order.snapshot.paymentTerms || order.snapshot.termsAndConditions ? <DetailSection title="Terms"><DetailFields fields={[{ label: 'Payment terms', value: order.snapshot.paymentTerms || 'Not specified' }, { label: 'Terms & conditions', value: order.snapshot.termsAndConditions || 'Not specified' }]} /></DetailSection> : null}
    {invoice ? <OrderInvoiceConversion order={order} onClose={() => setInvoice(false)} /> : null}

  </PageContainer>;
}
