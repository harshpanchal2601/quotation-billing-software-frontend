import { Alert, MenuItem, TextField, Typography } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import type { SalesOrder } from '@features/sales-orders';
import { PERMISSIONS, useHasPermission } from '@features/auth';
import { toApiError } from '@shared/api/apiClient';
import { CommandForm } from '@shared/forms/CommandForm';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { AppButton } from '@shared/ui/actions';
import { DetailActions, DetailSection } from '@shared/ui/layout';
import { RecordPagination, RecordTable, useTableSort } from '@shared/ui/tables';
import { inventoryCommand, inventoryKeys, listReservations, listWarehouses } from './inventory.api';
import { WarehouseField } from './WarehouseField';

export function OrderStockPanel({ order }: { order: SalesOrder }) {
  const firmId = useFirmId(); const cache = useQueryClient(); const manage = useHasPermission(PERMISSIONS.INVENTORY_MANAGE); const view = useHasPermission(PERMISSIONS.INVENTORY_VIEW); const tracked = order.lines.filter((line) => line.snapshot.stockTracking);
  const [params, setParams] = useSearchParams();
  const requestedPage = Number(params.get('reservationPage')); const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 && requestedPage <= 100000 ? requestedPage : 1;
  const sorting = useTableSort([{ key: 'id', label: 'Record number' }, { key: 'quantity', label: 'Reserved quantity' }, { key: 'remaining', label: 'Remaining quantity' }, { key: 'status', label: 'Status' }], { paramPrefix: 'reservation' });
  const scope = inventoryKeys.firm(firmId);
  const query = { salesOrderId: order.id, page, limit: 20, sortBy: sorting.sortBy, sortOrder: sorting.sortOrder };
  const reservations = useQuery({ queryKey: [...scope, 'order-reservations', query], queryFn: ({ signal }) => listReservations(query, signal), enabled: firmId != null && view && !!tracked.length });
  const refresh = () => cache.invalidateQueries({ queryKey: scope }, { throwOnError: true });
  if (!view || !tracked.length) return null;
  return <DetailSection title="Stock reservations" description="Stock held for this order is unavailable to other orders until dispatched or released.">
    {reservations.isError ? <Alert severity="error" action={<AppButton onClick={() => void reservations.refetch()}>Retry reservations</AppButton>}>{toApiError(reservations.error).message}</Alert> : null}
    {reservations.isPending ? <Typography role="status">Loading reservations…</Typography> : null}
    {reservations.data ? <><RecordTable rows={reservations.data.reservations} sorting={sorting} rowNumberStart={(page - 1) * 20 + 1} label="Order stock reservations" rowKey={(row) => row.id} emptyMessage="No stock is reserved for this order." columns={[
      { key: 'id', sortKey: 'id', label: 'Reservation', render: (row) => `#${row.id}` },
      { key: 'line', label: 'Item', render: (row) => tracked.find((line) => line.id === row.salesOrderLineId)?.snapshot.itemName ?? row.position?.item.name ?? `Order line #${row.salesOrderLineId}` },
      { key: 'warehouse', label: 'Warehouse', render: (row) => row.position ? `${row.position.warehouse.code} · ${row.position.warehouse.name}` : 'Not specified' },
      { key: 'quantity', sortKey: 'quantity', label: 'Reserved', align: 'right', render: (row) => row.quantity }, { key: 'remaining', sortKey: 'remaining', label: 'Remaining', align: 'right', render: (row) => row.remaining }, { key: 'status', sortKey: 'status', label: 'Status', render: (row) => row.status },
      { key: 'actions', label: 'Actions', render: (row) => manage && row.status === 'ACTIVE' ? <CommandForm dialog title={`Release reservation #${row.id}`} label="Release stock" successMessage="Stock reservation released." confirmation={{ title: `Release reservation #${row.id}?`, description: 'The remaining reserved quantity becomes available for other orders.', color: 'warning' }} saved={refresh} submit={(data) => inventoryCommand(`/stock/reservations/${row.id}/release`, { reason: String(data.get('reason')).trim() })}><TextField name="reason" label="Reason" required inputProps={{ minLength: 5, maxLength: 2000 }} /></CommandForm> : '—' },
    ]} /><RecordPagination pagination={reservations.data.pagination} page={page} change={(value) => setParams((current) => { const next = new URLSearchParams(current); next.set('reservationPage', String(value)); return next; }, { replace: true })} /></> : null}
    {manage && order.status !== 'CANCELLED' && order.status !== 'FULFILLED' ? <DetailActions label="Reservation actions"><CommandForm dialog title="Reserve goods for this order" label="Reserve stock" successMessage="Stock reserved for this order." saved={refresh} submit={(data, idempotencyKey) => inventoryCommand('/stock/reservations', { salesOrderId: order.id, salesOrderLineId: Number(data.get('salesOrderLineId')), warehouseId: Number(data.get('warehouseId')), quantity: String(data.get('quantity')), idempotencyKey })}><TextField name="salesOrderLineId" select label="Stock order line" defaultValue="" required><MenuItem value="" disabled>Select order line</MenuItem>{tracked.map((line) => <MenuItem key={line.id} value={line.id}>{line.snapshot.itemName}</MenuItem>)}</TextField><WarehouseField name="warehouseId" label="Reservation warehouse" context="inventory" load={(search, signal) => listWarehouses(signal, search)} required /><TextField name="quantity" label="Quantity to reserve" required inputProps={{ inputMode: 'decimal', pattern: '\\d+(\\.\\d{1,3})?' }} /></CommandForm></DetailActions> : null}
  </DetailSection>;
}
