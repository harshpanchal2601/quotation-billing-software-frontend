import { Alert } from '@mui/material';
import { formatRecordStatus, formatStockEvent } from '@shared/ui/display';
import { RecordTable, type TableSorting } from '@shared/ui/tables';
import type { StockMovement, StockPosition } from './inventory.api';

export const STOCK_POSITION_SORT_FIELDS = [{ key: 'id', label: 'Record number' }, { key: 'onHand', label: 'On hand' }, { key: 'reserved', label: 'Reserved' }, { key: 'value', label: 'Valuation' }, { key: 'reorderLevel', label: 'Reorder level' }] as const;
export const STOCK_MOVEMENT_SORT_FIELDS = [{ key: 'id', label: 'Record number' }, { key: 'postedAt', label: 'Recorded date' }, { key: 'quantity', label: 'Quantity' }, { key: 'value', label: 'Value' }, { key: 'eventType', label: 'Event' }] as const;

const stockSources: Record<string, string> = { STOCK_OPERATION: 'Stock operation', WORK_ORDER: 'Work order', FULFILLMENT: 'Order completion', RECEIPT: 'Goods receipt', RECEIPT_RETURN: 'Supplier return' };
function formatStockSource(source: string) { return Object.prototype.hasOwnProperty.call(stockSources, source) ? stockSources[source] : formatRecordStatus(source); }

export { RecordPagination as Paging } from '@shared/ui/tables';
export function PositionsTable({ rows, rowNumberStart = 1, sorting }: { rows: StockPosition[]; rowNumberStart?: number; sorting?: TableSorting }) {
  return <><RecordTable rows={rows} rowNumberStart={rowNumberStart} sorting={sorting} label="Stock by warehouse" rowKey={(row) => row.id} emptyMessage="No stock positions match these filters." columns={[
    { key: 'warehouse', label: 'Warehouse', render: (row) => row.warehouse.name }, { key: 'item', label: 'Item', render: (row) => row.item.name },
    { key: 'onHand', sortKey: 'onHand', label: 'On hand', align: 'right', render: (row) => row.onHand }, { key: 'reserved', sortKey: 'reserved', label: 'Reserved', align: 'right', render: (row) => row.reserved },
    { key: 'available', label: 'Available', align: 'right', render: (row) => row.available }, { key: 'value', sortKey: 'value', label: 'Valuation', align: 'right', render: (row) => `${row.currency} ${row.value}` },
    { key: 'average', label: 'Average cost', align: 'right', render: (row) => row.averageCost }, { key: 'reorder', sortKey: 'reorderLevel', label: 'Reorder level', align: 'right', render: (row) => row.reorderLevel },
    { key: 'status', label: 'Status', render: (row) => !row.reconciled ? 'Reconciliation required' : row.lowStock ? 'Low stock' : 'In stock' },
  ]} />{rows.some((row) => !row.reconciled) ? <Alert severity="error">Stock projections differ from ledger or active reservations. Resolve reconciliation before further posting.</Alert> : null}</>;
}
export function PeriodStockTable({ rows, rowNumberStart = 1, sorting }: { rows: StockPosition[]; rowNumberStart?: number; sorting?: TableSorting }) {
  return <RecordTable rows={rows} rowNumberStart={rowNumberStart} sorting={sorting} label="Period stock report" rowKey={(row) => row.id} emptyMessage="No stock positions match this period." columns={[
    { key: 'warehouse', label: 'Warehouse', render: (row) => row.warehouse.name }, { key: 'item', label: 'Item', render: (row) => row.item.name },
    { key: 'currency', label: 'Currency', render: (row) => row.currency },
    { key: 'openingQuantity', label: 'Opening quantity', align: 'right', render: (row) => row.openingQuantity }, { key: 'openingValue', label: 'Opening value', align: 'right', render: (row) => row.openingValue },
    { key: 'closingQuantity', label: 'Closing quantity', align: 'right', render: (row) => row.closingQuantity }, { key: 'closingValue', label: 'Closing value', align: 'right', render: (row) => row.closingValue },
  ]} />;
}
export function MovementTable({ rows, rowNumberStart = 1, sorting }: { rows: StockMovement[]; rowNumberStart?: number; sorting?: TableSorting }) {
  return <RecordTable rows={rows} rowNumberStart={rowNumberStart} sorting={sorting} label="Stock movement ledger" rowKey={(row) => row.id} emptyMessage="No stock movements match these filters." columns={[
    { key: 'id', sortKey: 'id', label: 'Movement', render: (row) => row.id }, { key: 'posted', sortKey: 'postedAt', label: 'Recorded', render: (row) => new Date(row.postedAt).toLocaleString() },
    { key: 'warehouse', label: 'Warehouse', render: (row) => row.position.warehouse.name }, { key: 'item', label: 'Item', render: (row) => row.position.item.name },
    { key: 'event', sortKey: 'eventType', label: 'Event', render: (row) => formatStockEvent(row.eventType) }, { key: 'source', label: 'Source', render: (row) => `${formatStockSource(row.sourceType)} #${row.sourceId} · Line ${row.sourceLineId}` },
    { key: 'quantity', sortKey: 'quantity', label: 'Quantity', align: 'right', render: (row) => row.quantity }, { key: 'value', sortKey: 'value', label: 'Value', align: 'right', render: (row) => `${row.position.currency} ${row.value}` },
    { key: 'original', label: 'Original movement', render: (row) => row.originalMovementId ?? '—' }, { key: 'reason', label: 'Reason', render: (row) => row.reason },
  ]} />;
}
