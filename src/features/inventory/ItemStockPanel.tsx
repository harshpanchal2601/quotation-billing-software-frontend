import { Alert, Stack, Typography } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { PERMISSIONS, useHasPermission } from '@features/auth';
import { toApiError } from '@shared/api/apiClient';
import { CommandForm } from '@shared/forms/CommandForm';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { inventoryCommand, inventoryKeys, listMovements, listStock } from './inventory.api';
import { MovementTable, Paging, PositionsTable } from './StockTables';

export function ItemStockPanel({ itemId, kind, stockTracking, changed }: { itemId: number; kind: 'GOODS' | 'SERVICE'; stockTracking: boolean; changed: () => Promise<unknown> }) {
  const firmId = useFirmId(); const cache = useQueryClient(); const view = useHasPermission(PERMISSIONS.INVENTORY_VIEW); const manageStock = useHasPermission(PERMISSIONS.INVENTORY_MANAGE); const manageItem = useHasPermission(PERMISSIONS.ITEMS_MANAGE);
  const [page, setPage] = useState(1); const scope = inventoryKeys.firm(firmId);
  const positions = useQuery({ queryKey: [...scope, 'item', itemId, 'positions', page], queryFn: ({ signal }) => listStock({ itemId, page, limit: 20 }, signal), enabled: firmId != null && view && stockTracking });
  const ledger = useQuery({ queryKey: [...scope, 'item', itemId, 'ledger', page], queryFn: ({ signal }) => listMovements({ itemId, page, limit: 20 }, signal), enabled: firmId != null && view && stockTracking });
  if (!view || kind === 'SERVICE') return null;
  return <Stack spacing={2}><Typography variant="h6">Inventory</Typography><Typography>{stockTracking ? 'Stock tracking enabled' : 'Stock tracking disabled'}</Typography>
    {manageItem && manageStock ? <CommandForm title={stockTracking ? 'Disable stock tracking' : 'Enable stock tracking'} label="Confirm stock tracking change" submit={() => inventoryCommand(`/items/${itemId}/inventory`, { stockTracking: !stockTracking }, 'put')} saved={async () => { await Promise.all([changed(), cache.invalidateQueries({ queryKey: scope })]); }}><Typography>Only goods can track stock. Tracking is retained once an item has stock history or open stock commitments.</Typography></CommandForm> : null}
    {[positions.error, ledger.error].filter(Boolean).map((error, index) => <Alert severity="error" key={index}>{toApiError(error).message}</Alert>)}
    {positions.data ? <><PositionsTable rows={positions.data.positions} /><Paging pagination={positions.data.pagination} page={page} change={setPage} /></> : null}
    {ledger.data ? <><MovementTable rows={ledger.data.movements} /><Paging pagination={ledger.data.pagination} page={page} change={setPage} /></> : null}
  </Stack>;
}
