import { Alert, Typography } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { PERMISSIONS, useHasPermission } from '@features/auth';
import { toApiError } from '@shared/api/apiClient';
import { DetailSection } from '@shared/ui/layout';
import { AppButton } from '@shared/ui/actions';
import { CommandForm } from '@shared/forms/CommandForm';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { useTableSort } from '@shared/ui/tables';
import { inventoryCommand, inventoryKeys, listMovements, listStock } from './inventory.api';
import { MovementTable, Paging, PositionsTable, STOCK_MOVEMENT_SORT_FIELDS, STOCK_POSITION_SORT_FIELDS } from './StockTables';

export function ItemStockPanel({ itemId, kind, stockTracking, changed }: { itemId: number; kind: 'GOODS' | 'SERVICE'; stockTracking: boolean; changed: () => Promise<unknown> }) {
  const firmId = useFirmId(); const cache = useQueryClient(); const view = useHasPermission(PERMISSIONS.INVENTORY_VIEW); const manageStock = useHasPermission(PERMISSIONS.INVENTORY_MANAGE); const manageItem = useHasPermission(PERMISSIONS.ITEMS_MANAGE);
  const [positionPage, setPositionPage] = useState(1); const [movementPage, setMovementPage] = useState(1); const scope = inventoryKeys.firm(firmId);
  const positionSort = useTableSort(STOCK_POSITION_SORT_FIELDS, { paramPrefix: 'stock', defaultSortOrder: 'asc', onChange: () => setPositionPage(1) });
  const movementSort = useTableSort(STOCK_MOVEMENT_SORT_FIELDS, { paramPrefix: 'movements', onChange: () => setMovementPage(1) });
  const positionParams = { itemId, page: positionPage, limit: 20, sortBy: positionSort.sortBy, sortOrder: positionSort.sortOrder };
  const movementParams = { itemId, page: movementPage, limit: 20, sortBy: movementSort.sortBy, sortOrder: movementSort.sortOrder };
  const positions = useQuery({ queryKey: [...scope, 'item', itemId, 'positions', positionParams], queryFn: ({ signal }) => listStock(positionParams, signal), enabled: firmId != null && view && stockTracking });
  const ledger = useQuery({ queryKey: [...scope, 'item', itemId, 'ledger', movementParams], queryFn: ({ signal }) => listMovements(movementParams, signal), enabled: firmId != null && view && stockTracking });
  if (!view || kind === 'SERVICE') return null;
  return <DetailSection title="Inventory" description={stockTracking ? 'Stock tracking enabled' : 'Stock tracking disabled'}>
    {manageItem && manageStock ? <CommandForm dialog title={stockTracking ? 'Disable stock tracking' : 'Enable stock tracking'} label="Confirm stock tracking change" submit={() => inventoryCommand(`/items/${itemId}/inventory`, { stockTracking: !stockTracking }, 'put')} saved={async () => { await Promise.all([changed(), cache.invalidateQueries({ queryKey: scope })]); }}><Typography>Only goods can track stock. Tracking is retained once an item has stock history or open stock commitments.</Typography></CommandForm> : null}
    {[positions.error, ledger.error].filter(Boolean).map((error, index) => <Alert severity="error" key={index}>{toApiError(error).message}</Alert>)}
    {positions.isFetching || ledger.isFetching ? <Typography role="status">Loading item inventory…</Typography> : null}
    {positions.data ? <><PositionsTable rows={positions.data.positions} sorting={positionSort} rowNumberStart={(positionPage - 1) * 20 + 1} /><Paging pagination={positions.data.pagination} page={positionPage} change={setPositionPage} /></> : null}
    {ledger.data ? <><MovementTable rows={ledger.data.movements} sorting={movementSort} rowNumberStart={(movementPage - 1) * 20 + 1} /><Paging pagination={ledger.data.pagination} page={movementPage} change={setMovementPage} /></> : null}
    {positions.isError || ledger.isError ? <AppButton onClick={() => { void positions.refetch(); void ledger.refetch(); }}>Retry item inventory</AppButton> : null}
  </DetailSection>;
}
