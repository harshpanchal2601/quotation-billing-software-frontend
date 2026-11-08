import { Alert, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { SalesOrder } from '@features/sales-orders';
import { PERMISSIONS, useHasPermission } from '@features/auth';
import { toApiError } from '@shared/api/apiClient';
import { CommandForm } from '@shared/forms/CommandForm';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { inventoryCommand, inventoryKeys, listReservations, listWarehouses } from './inventory.api';
import { WarehouseField } from './WarehouseField';

export function OrderStockPanel({ order }: { order: SalesOrder }) {
  const firmId = useFirmId(); const cache = useQueryClient(); const manage = useHasPermission(PERMISSIONS.INVENTORY_MANAGE); const tracked = order.lines.filter((line) => line.snapshot.stockTracking);
  const scope = inventoryKeys.firm(firmId);
  const reservations = useQuery({ queryKey: [...scope, 'order-reservations', order.id], queryFn: ({ signal }) => listReservations({ salesOrderId: order.id, page: 1, limit: 100 }, signal), enabled: firmId != null && manage && !!tracked.length });
  if (!manage || !tracked.length || order.status === 'CANCELLED') return null;
  return <Stack spacing={2}><Typography variant="h6">Stock reservations</Typography>{[reservations.error].filter(Boolean).map((error, index) => <Alert severity="error" key={index}>{toApiError(error).message}</Alert>)}{reservations.data?.reservations.map((row) => <Typography key={row.id}>Line #{row.salesOrderLineId} · {row.remaining} held · {row.status}</Typography>)}
    <CommandForm title="Reserve goods for this order" label="Reserve stock" saved={() => cache.invalidateQueries({ queryKey: scope })} submit={(data, idempotencyKey) => inventoryCommand('/stock/reservations', { salesOrderId: order.id, salesOrderLineId: Number(data.get('salesOrderLineId')), warehouseId: Number(data.get('warehouseId')), quantity: String(data.get('quantity')), idempotencyKey })}><TextField name="salesOrderLineId" select label="Stock order line" defaultValue="" required><MenuItem value="" disabled>Select order line</MenuItem>{tracked.map((line) => <MenuItem key={line.id} value={line.id}>{line.snapshot.itemName}</MenuItem>)}</TextField><WarehouseField name="warehouseId" label="Reservation warehouse" context="inventory" load={(search, signal) => listWarehouses(signal, search)} required /><TextField name="quantity" label="Quantity to reserve" required inputProps={{ inputMode: 'decimal', pattern: '\\d+(\\.\\d{1,3})?' }} /></CommandForm>
  </Stack>;
}
