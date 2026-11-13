import { Alert, Stack, TextField, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { PERMISSIONS, useAuth, useHasPermission } from '@features/auth';
import { listWarehouses, Paging, WarehouseField } from '@features/inventory';
import { toApiError } from '@shared/api/apiClient';
import { CommandForm } from '@shared/forms/CommandForm';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { AppButton } from '@shared/ui/actions';
import { formatRecordStatus, formatStockEvent } from '@shared/ui/display';
import { DetailActions, DetailFields, DetailSection, PageContainer, PageHeader, WorkspaceTabs } from '@shared/ui/layout';
import { AppDialog } from '@shared/ui/dialogs';
import { RecordTable, useTableSort } from '@shared/ui/tables';
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
  const compact = useMediaQuery(useTheme().breakpoints.down('sm'));
  const canManage = useHasPermission(PERMISSIONS.MANUFACTURING_MANAGE); const canPost = useHasPermission(PERMISSIONS.MANUFACTURING_POST);
  const scope = manufacturingKeys.firm(firmId, user?.id);
  const [tab, setTab] = useState('boms'); const [page, setPage] = useState(1); const [search, setSearch] = useState('');
  const sorting = useTableSort([{ key: 'id', label: 'Record number' }, { key: 'createdAt', label: 'Created date' }, ...(tab === 'boms' ? [{ key: 'code', label: 'BOM code' }, { key: 'name', label: 'Name' }, { key: 'revision', label: 'Revision' }, { key: 'outputQuantity', label: 'Output quantity' }] : [{ key: 'status', label: 'Status' }, { key: 'quantity', label: 'Quantity' }])], { onChange: () => setPage(1) });
  const [componentRows, setComponentRows] = useState(() => [crypto.randomUUID()]);
  const [selectedBom, setSelectedBom] = useState<Bom | null>(null); const [orderId, setOrderId] = useState<number | null>(null);
  const boms = useQuery({ queryKey: [...scope, 'boms', page, search, sorting.sortBy, sorting.sortOrder], queryFn: ({ signal }) => loadBoms(page, search, signal, { sortBy: sorting.sortBy, sortOrder: sorting.sortOrder }), enabled: firmId != null && tab === 'boms' });
  const orders = useQuery({ queryKey: [...scope, 'orders', page, search, sorting.sortBy, sorting.sortOrder], queryFn: ({ signal }) => loadWorkOrders(page, search, signal, { sortBy: sorting.sortBy, sortOrder: sorting.sortOrder }), enabled: firmId != null && tab === 'orders' });
  const detail = useQuery({ queryKey: [...scope, 'order', orderId], queryFn: ({ signal }) => loadWorkOrder(orderId!, signal), enabled: firmId != null && orderId != null && tab === 'orders' });
  const refresh = () => Promise.all([cache.invalidateQueries({ queryKey: scope }), cache.invalidateQueries({ queryKey: ['inventory', firmId] }), cache.invalidateQueries({ queryKey: ['reports', firmId] })]);
  const active = tab === 'boms' ? boms : orders; const order = detail.data;
  const createBom = canManage ? <CommandForm dialog title="Create bill of materials (BOM)" onClosed={() => setComponentRows([crypto.randomUUID()])} successMessage="BOM version created." saved={async () => { await refresh(); setComponentRows([crypto.randomUUID()]); }} label="Create BOM version" submit={(data, idempotencyKey) => manufacturingCommand('/boms', { code: text(data, 'code'), name: text(data, 'name'), outputItemId: id(data, 'outputItemId'), outputQuantity: text(data, 'outputQuantity'), components: componentRows.map((key) => ({ itemId: id(data, `item-${key}`), quantity: text(data, `quantity-${key}`) })), idempotencyKey })}>
        <TextField name="code" label="BOM code" required inputProps={{ maxLength: 50 }} helperText="Reusing a code creates a new version; previous versions stay unchanged." />
        <TextField name="name" label="BOM name" required inputProps={{ maxLength: 191 }} />
        <ManufacturingItemField name="outputItemId" label="Finished item" />
        <TextField name="outputQuantity" label="Output quantity per BOM" required inputProps={{ inputMode: 'decimal', pattern: '\\d+(\\.\\d{1,3})?' }} />
        {componentRows.map((key, index) => <Stack spacing={1} key={key}><ManufacturingItemField name={`item-${key}`} label={`Component ${index + 1}`} /><TextField name={`quantity-${key}`} label={`Component ${index + 1} quantity per BOM`} required inputProps={{ inputMode: 'decimal', pattern: '\\d+(\\.\\d{1,3})?' }} />{componentRows.length > 1 ? <AppButton type="button" variant="text" onClick={() => setComponentRows(componentRows.filter((row) => row !== key))}>Remove component {index + 1}</AppButton> : null}</Stack>)}
        <AppButton type="button" variant="outlined" disabled={componentRows.length >= 100} onClick={() => setComponentRows([...componentRows, crypto.randomUUID()])}>Add component</AppButton>
      </CommandForm> : null;
  return <PageContainer>
    <PageHeader actions={tab === 'boms' ? createBom : undefined} title="Manufacturing" description="Component lists, production orders and stock updates" />
    <Typography>Completing production reduces component stock and adds finished goods at the component cost. Cancelling it requires enough finished stock to return the components. All stock changes stay in the history.</Typography>
    <TextField label="Search BOM code or name" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
    <WorkspaceTabs value={tab} label="Manufacturing records" items={[{ value: 'boms', label: 'BOM versions' }, { value: 'orders', label: 'Work orders' }]} onChange={(value) => { setTab(value); setPage(1); }} />
    {active.error ? <Alert severity="error">{toApiError(active.error).message}</Alert> : null}
    {active.isFetching ? <Typography role="status">Loading manufacturing records…</Typography> : null}
    {tab === 'boms' ? <Stack spacing={3}>
      {boms.data ? <RecordTable rows={boms.data.records} sorting={sorting} rowNumberStart={(page - 1) * 20 + 1} label="Bill of materials versions" rowKey={(row) => row.id} emptyMessage="No BOM versions found. Create a bill of materials to define a finished item and its components." columns={[
        { key: 'code', sortKey: 'code', label: 'BOM code', render: (row) => row.code }, { key: 'revision', sortKey: 'revision', label: 'Revision', align: 'right', render: (row) => row.revision }, { key: 'name', sortKey: 'name', label: 'Name', render: (row) => row.name },
        { key: 'output', label: 'Finished item', render: (row) => row.outputName }, { key: 'quantity', sortKey: 'outputQuantity', label: 'Output quantity', align: 'right', render: (row) => `${row.outputQuantity} ${row.outputUnit}` },
        { key: 'components', label: 'Components', render: (row) => <Stack spacing={0.5}>{row.components.map((line) => <Typography key={line.id} variant="body2">{line.name} · {line.quantity} {line.unit}</Typography>)}</Stack> },
        ...(canManage ? [{ key: 'actions', label: 'Actions', render: (bom: Bom) => <AppButton onClick={() => { setSelectedBom(bom); setTab('orders'); setPage(1); }}>Plan work order from {bom.code} revision {bom.revision}</AppButton> }] : []),
      ]} /> : null}
      <Paging pagination={boms.data?.pagination} page={page} change={setPage} />

    </Stack> : <Stack spacing={3}>
      {canManage && selectedBom ? <CommandForm dialog initialOpen hideTrigger key={selectedBom.id} onClosed={() => setSelectedBom(null)} title={`Plan ${selectedBom.code} revision ${selectedBom.revision}`} successMessage="Work order created." saved={async () => { await refresh(); setSelectedBom(null); }} label="Create work order" submit={(data, idempotencyKey) => manufacturingCommand('/work-orders', { bomId: selectedBom.id, warehouseId: id(data, 'warehouseId'), quantity: text(data, 'quantity'), idempotencyKey })}>
        <WarehouseField name="warehouseId" label="Production warehouse" context="inventory" load={(search, signal) => listWarehouses(signal, search)} required />
        <TextField name="quantity" label="Finished output quantity" required inputProps={{ inputMode: 'decimal', pattern: '\\d+(\\.\\d{1,3})?' }} helperText={`BOM basis: ${selectedBom.outputQuantity} ${selectedBom.outputUnit}. Component quantities must fit their unit precision.`} />
      </CommandForm> : canManage ? <Typography>Select a BOM version to plan production.</Typography> : null}
      {orders.data ? <RecordTable rows={orders.data.records} sorting={sorting} rowNumberStart={(page - 1) * 20 + 1} label="Work orders" rowKey={(row) => row.id} emptyMessage="No work orders found. Choose a BOM version and plan a work order." columns={[
        { key: 'id', sortKey: 'id', label: 'Work order', render: (row) => `#${row.id}` }, { key: 'bom', label: 'BOM', render: (row) => `${row.snapshot.bomCode} · Revision ${row.snapshot.bomRevision}` },
        { key: 'output', label: 'Finished item', render: (row) => row.snapshot.output.name }, { key: 'quantity', sortKey: 'quantity', label: 'Quantity', align: 'right', render: (row) => `${row.quantity} ${row.snapshot.output.unit}` },
        { key: 'status', sortKey: 'status', label: 'Status', render: (row) => formatRecordStatus(row.status) }, { key: 'actions', label: 'Actions', render: (row) => <AppButton variant="outlined" onClick={() => setOrderId(row.id)}>View work order #{row.id}</AppButton> },
      ]} /> : null}
      <Paging pagination={orders.data?.pagination} page={page} change={setPage} />
      <AppDialog open={orderId !== null} title={`Work order #${orderId ?? ''}`} onClose={() => setOrderId(null)} showCloseButton fullWidth maxWidth="md" fullScreen={compact}>
      {detail.isFetching ? <Typography role="status">Loading work order…</Typography> : detail.isError ? <Alert severity="error" action={<AppButton onClick={() => void detail.refetch()}>Retry</AppButton>}>{toApiError(detail.error).message}</Alert> : order ? <Stack spacing={2}>
        <DetailSection title="Work order details"><DetailFields fields={[
          { label: 'Status', value: formatRecordStatus(order.status) }, { label: 'Version', value: order.version },
          { label: 'Finished item', value: order.snapshot.output.name }, { label: 'Output quantity', value: `${order.quantity} ${order.snapshot.output.unit}` },
          { label: 'Warehouse', value: order.warehouse ? `${order.warehouse.name} (${order.warehouse.code})` : `Warehouse #${order.warehouseId}` },
          { label: 'Bill of materials', value: `${order.snapshot.bomCode} · Revision ${order.snapshot.bomRevision}` }, { label: 'Currency', value: order.currency },
        ]} /></DetailSection>
        <DetailSection title="Components">
        <RecordTable rows={order.snapshot.components} label="Work order components" rowKey={(line) => line.lineId} columns={[
          { key: 'item', label: 'Component', minWidth: 200, sortValue: (line) => line.name, render: (line) => line.name },
          { key: 'itemId', label: 'Item number', minWidth: 112, sortValue: (line) => line.itemId, render: (line) => `#${line.itemId}` },
          { key: 'quantity', label: 'Quantity', align: 'right', minWidth: 112, sortValue: (line) => line.quantity, render: (line) => line.quantity },
          { key: 'unit', label: 'Unit', minWidth: 96, sortValue: (line) => line.unit, render: (line) => line.unit },
        ]} />
        </DetailSection>
        <DetailSection title="Stock movements">
        <RecordTable rows={order.movements} label="Work order stock movements" rowKey={(movement) => movement.id} emptyMessage="No stock movements have been recorded for this work order." columns={[
          { key: 'id', label: 'Stock entry', minWidth: 112, sortValue: (movement) => movement.id, render: (movement) => `#${movement.id}` },
          { key: 'type', label: 'Event', minWidth: 200, sortValue: (movement) => formatStockEvent(movement.eventType), render: (movement) => formatStockEvent(movement.eventType) },
          { key: 'quantity', label: 'Quantity', align: 'right', minWidth: 112, sortValue: (movement) => movement.quantity, render: (movement) => movement.quantity },
          { key: 'value', label: 'Value', align: 'right', minWidth: 160, sortValue: (movement) => movement.value, render: (movement) => `${order.currency} ${movement.value}` },
          { key: 'original', label: 'Original stock entry', minWidth: 160, sortValue: (movement) => movement.originalMovementId, render: (movement) => movement.originalMovementId ? `#${movement.originalMovementId}` : '—' },
        ]} />
        </DetailSection>
        {canPost && order.status !== 'CANCELLED' ? <DetailActions label="Work order actions">{(order.status === 'DRAFT' ? ['complete', 'cancel'] as const : ['cancel'] as const).map((action) => <CommandForm dialog key={`${order.id}:${order.version}:${action}`} title={action === 'complete' ? 'Complete entire work order' : 'Cancel work order'} label={action === 'complete' ? 'Complete production' : 'Cancel work order'} cancelLabel={action === 'cancel' ? 'Keep work order' : 'Cancel'} submitColor={action === 'cancel' ? 'error' : 'primary'} confirmation={{ title: action === 'complete' ? `Complete work order #${order.id}?` : `Cancel work order #${order.id}?`, description: action === 'complete' ? 'This consumes the listed components and records finished output in the stock ledger.' : order.status === 'COMPLETED' ? 'This reverses the finished output and component movements. Available output stock is required.' : 'This cancels the draft work order.', color: action === 'cancel' ? 'warning' : 'primary' }} successMessage={action === 'complete' ? 'Work order completed.' : 'Work order cancelled.'} saved={async () => { await refresh(); setOrderId(null); }} submit={(data, idempotencyKey) => manufacturingCommand(`/work-orders/${order.id}/${action}`, { expectedVersion: order.version, reason: text(data, 'reason'), idempotencyKey })}><TextField name="reason" label="Reason" required inputProps={{ minLength: 5, maxLength: 2000 }} /></CommandForm>)}</DetailActions> : null}
      </Stack> : null}
      </AppDialog>
    </Stack>}
    {active.isError ? <AppButton onClick={() => void active.refetch()}>Retry manufacturing</AppButton> : null}
  </PageContainer>;
}
