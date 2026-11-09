import { Alert, Paper, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { PERMISSIONS, useAuth, useHasPermission } from '@features/auth';
import { listWarehouses, Paging, WarehouseField } from '@features/inventory';
import { toApiError } from '@shared/api/apiClient';
import { CommandForm } from '@shared/forms/CommandForm';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { AppButton } from '@shared/ui/actions';
import { PageContainer, PageHeader } from '@shared/ui/layout';
import { ManufacturingItemField } from './ManufacturingItemField';
import { loadBoms, loadWorkOrder, loadWorkOrders, manufacturingCommand, manufacturingKeys, type Bom } from './manufacturing.api';

const text = (data: FormData, name: string) => String(data.get(name) ?? '').trim();
const id = (data: FormData, name: string) => Number(text(data, name));
export function ManufacturingPage() {
  const firmId = useFirmId(); const { user } = useAuth();
  return <ManufacturingWorkspace key={`${firmId}:${user?.id}`} />;
}
function ManufacturingWorkspace() {
  const firmId = useFirmId(); const { user } = useAuth(); const cache = useQueryClient();
  const canManage = useHasPermission(PERMISSIONS.MANUFACTURING_MANAGE); const canPost = useHasPermission(PERMISSIONS.MANUFACTURING_POST);
  const scope = manufacturingKeys.firm(firmId, user?.id);
  const [tab, setTab] = useState('boms'); const [page, setPage] = useState(1); const [search, setSearch] = useState('');
  const [componentRows, setComponentRows] = useState(() => [crypto.randomUUID()]);
  const [selectedBom, setSelectedBom] = useState<Bom | null>(null); const [orderId, setOrderId] = useState<number | null>(null);
  const boms = useQuery({ queryKey: [...scope, 'boms', page, search], queryFn: ({ signal }) => loadBoms(page, search, signal), enabled: firmId != null && tab === 'boms' });
  const orders = useQuery({ queryKey: [...scope, 'orders', page, search], queryFn: ({ signal }) => loadWorkOrders(page, search, signal), enabled: firmId != null && tab === 'orders' });
  const detail = useQuery({ queryKey: [...scope, 'order', orderId], queryFn: ({ signal }) => loadWorkOrder(orderId!, signal), enabled: firmId != null && orderId != null && tab === 'orders' });
  const refresh = () => Promise.all([cache.invalidateQueries({ queryKey: scope }), cache.invalidateQueries({ queryKey: ['inventory', firmId] }), cache.invalidateQueries({ queryKey: ['reports', firmId] })]);
  const active = tab === 'boms' ? boms : orders; const order = detail.data;
  return <PageContainer>
    <PageHeader title="Manufacturing" description="Versioned bills of materials and whole work orders using the stock ledger" />
    <Typography>Completion consumes components and receives finished goods at their actual component valuation. Costs stay in the inventory currency. Cancelling completed production requires available output stock and appends reversing movements.</Typography>
    <TextField label="Search BOM code or name" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
    <Tabs value={tab} onChange={(_, value: string) => { setTab(value); setPage(1); }}><Tab value="boms" label="BOM versions" /><Tab value="orders" label="Work orders" /></Tabs>
    {[active.error, detail.error].filter(Boolean).map((error, index) => <Alert severity="error" key={index}>{toApiError(error).message}</Alert>)}
    {active.isFetching ? <Typography role="status">Loading manufacturing records…</Typography> : null}
    {tab === 'boms' ? <Stack spacing={3}>
      {boms.data?.records.map((bom) => <Paper variant="outlined" key={bom.id} sx={{ p: 2 }}><Stack spacing={1}>
        <Typography component="h2" variant="h6">{bom.code} · Revision {bom.revision} · {bom.name}</Typography>
        <Typography>Output: {bom.outputName} · {bom.outputQuantity} {bom.outputUnit}</Typography>
        {bom.components.map((line) => <Typography key={line.id}>{line.name} · {line.quantity} {line.unit}</Typography>)}
        {canManage ? <AppButton variant="outlined" onClick={() => { setSelectedBom(bom); setTab('orders'); setPage(1); }}>Plan work order from {bom.code} revision {bom.revision}</AppButton> : null}
      </Stack></Paper>)}
      <Paging pagination={boms.data?.pagination} page={page} change={setPage} />
      {canManage ? <CommandForm title="Create immutable BOM version" saved={refresh} label="Create BOM version" submit={(data, idempotencyKey) => manufacturingCommand('/boms', { code: text(data, 'code'), name: text(data, 'name'), outputItemId: id(data, 'outputItemId'), outputQuantity: text(data, 'outputQuantity'), components: componentRows.map((key) => ({ itemId: id(data, `item-${key}`), quantity: text(data, `quantity-${key}`) })), idempotencyKey })}>
        <TextField name="code" label="BOM code" required inputProps={{ maxLength: 50 }} helperText="Reusing a code creates a new version; previous versions stay unchanged." />
        <TextField name="name" label="BOM name" required inputProps={{ maxLength: 191 }} />
        <ManufacturingItemField name="outputItemId" label="Finished item" />
        <TextField name="outputQuantity" label="Output quantity per BOM" required inputProps={{ inputMode: 'decimal', pattern: '\\d+(\\.\\d{1,3})?' }} />
        {componentRows.map((key, index) => <Stack spacing={1} key={key}><ManufacturingItemField name={`item-${key}`} label={`Component ${index + 1}`} /><TextField name={`quantity-${key}`} label={`Component ${index + 1} quantity per BOM`} required inputProps={{ inputMode: 'decimal', pattern: '\\d+(\\.\\d{1,3})?' }} />{componentRows.length > 1 ? <AppButton type="button" variant="text" onClick={() => setComponentRows(componentRows.filter((row) => row !== key))}>Remove component {index + 1}</AppButton> : null}</Stack>)}
        <AppButton type="button" variant="outlined" disabled={componentRows.length >= 100} onClick={() => setComponentRows([...componentRows, crypto.randomUUID()])}>Add component</AppButton>
      </CommandForm> : null}
    </Stack> : <Stack spacing={3}>
      {canManage && selectedBom ? <CommandForm key={selectedBom.id} title={`Plan ${selectedBom.code} revision ${selectedBom.revision}`} saved={refresh} label="Create work order" submit={(data, idempotencyKey) => manufacturingCommand('/work-orders', { bomId: selectedBom.id, warehouseId: id(data, 'warehouseId'), quantity: text(data, 'quantity'), idempotencyKey })}>
        <WarehouseField name="warehouseId" label="Production warehouse" context="inventory" load={(search, signal) => listWarehouses(signal, search)} required />
        <TextField name="quantity" label="Finished output quantity" required inputProps={{ inputMode: 'decimal', pattern: '\\d+(\\.\\d{1,3})?' }} helperText={`BOM basis: ${selectedBom.outputQuantity} ${selectedBom.outputUnit}. Component quantities must fit their unit precision.`} />
      </CommandForm> : canManage ? <Typography>Select a BOM version to plan production.</Typography> : null}
      {orders.data?.records.map((row) => <Stack key={row.id} direction="row" spacing={2} alignItems="center"><Typography>Work order #{row.id} · {row.snapshot.bomCode} rev {row.snapshot.bomRevision} · {row.quantity} {row.snapshot.output.unit} · {row.status}</Typography><AppButton variant="outlined" onClick={() => setOrderId(row.id)}>View work order #{row.id}</AppButton></Stack>)}
      <Paging pagination={orders.data?.pagination} page={page} change={setPage} />
      {detail.isFetching ? <Typography role="status">Loading work order…</Typography> : order ? <Paper variant="outlined" sx={{ p: 2 }}><Stack spacing={2}>
        <Typography component="h2" variant="h6">Work order #{order.id} · {order.status}</Typography>
        <Typography>{order.snapshot.output.name} · {order.quantity} {order.snapshot.output.unit} · Warehouse #{order.warehouseId} · {order.currency}</Typography>
        {order.snapshot.components.map((line) => <Typography key={line.lineId}>Component: {line.name} · {line.quantity} {line.unit}</Typography>)}
        {order.movements.map((movement) => <Typography key={movement.id}>Movement #{movement.id} · {movement.eventType.replace(/_/g, ' ')} · Quantity {movement.quantity} · {order.currency} {movement.value}{movement.originalMovementId ? ` · Reverses #${movement.originalMovementId}` : ''}</Typography>)}
        {canPost && order.status !== 'CANCELLED' ? <>{(order.status === 'DRAFT' ? ['complete', 'cancel'] as const : ['cancel'] as const).map((action) => <CommandForm key={`${order.id}:${order.version}:${action}`} title={action === 'complete' ? 'Complete entire work order' : 'Cancel work order'} label={action === 'complete' ? 'Consume components and receive output' : 'Cancel work order'} saved={refresh} submit={(data, idempotencyKey) => manufacturingCommand(`/work-orders/${order.id}/${action}`, { expectedVersion: order.version, reason: text(data, 'reason'), idempotencyKey })}><TextField name="reason" label="Reason" required inputProps={{ minLength: 5, maxLength: 2000 }} /></CommandForm>)}</> : null}
      </Stack></Paper> : null}
    </Stack>}
    {active.isError ? <AppButton onClick={() => void active.refetch()}>Retry manufacturing</AppButton> : null}
  </PageContainer>;
}
