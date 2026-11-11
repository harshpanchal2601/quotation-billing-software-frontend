import { Alert, Box, MenuItem, Stack, TextField, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PERMISSIONS, useHasPermission } from '@features/auth';
import { toApiError } from '@shared/api/apiClient';
import { CommandForm } from '@shared/forms/CommandForm';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { AppButton } from '@shared/ui/actions';
import { AppStatusChip, formatRecordStatus } from '@shared/ui/display';
import { billingDateToday } from '@shared/dates/billingDate';
import { AppDialog } from '@shared/ui/dialogs';
import { RecordTable, useTableSort } from '@shared/ui/tables';
import { AmountSummary, DetailActions, DetailFields, DetailSection, PageContainer, PageHeader, WorkspaceTabs } from '@shared/ui/layout';
import { Paging, WarehouseField } from '@features/inventory';
import { getPurchase, listPurchases, listReceiptReturns, purchaseCommand, purchaseOptions, purchasingKeys, type PurchaseDocument, type PurchaseKind, type PurchaseOptions } from './purchasing.api';
import { PurchaseLineFields } from './PurchaseLineFields';

const text = (data: FormData, name: string) => String(data.get(name) ?? '').trim();
const supplierName = (row: PurchaseDocument) => row.supplierSnapshot?.name ?? row.order?.supplierSnapshot.name ?? row.snapshot?.supplier?.name ?? row.supplier?.name ?? 'No supplier linked';
const optional = (data: FormData, name: string) => text(data, name) || undefined;
const labels: Record<PurchaseKind, string> = { orders: 'Purchase orders', receipts: 'Goods receipts & returns', bills: 'Supplier bills', expenses: 'Expenses' };
const recordLabels: Record<PurchaseKind, string> = { orders: 'Purchase order', receipts: 'Goods receipt', bills: 'Supplier bill', expenses: 'Expense' };
export function PurchasingPage() { const firmId = useFirmId(); return <PurchasingWorkspace key={firmId} />; }
function PurchasingWorkspace() {
  const theme = useTheme(); const compact = useMediaQuery(theme.breakpoints.down('sm'));
  const firmId = useFirmId(); const cache = useQueryClient(); const [params, setParams] = useSearchParams(); const [page, setPage] = useState(1); const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const viewOrders = useHasPermission(PERMISSIONS.PURCHASING_VIEW); const viewBills = useHasPermission(PERMISSIONS.SUPPLIER_BILLS_VIEW); const viewExpenses = useHasPermission(PERMISSIONS.EXPENSES_VIEW);
  const canPurchase = useHasPermission(PERMISSIONS.PURCHASING_MANAGE); const canApprove = useHasPermission(PERMISSIONS.PURCHASING_APPROVE); const canBill = useHasPermission(PERMISSIONS.SUPPLIER_BILLS_MANAGE); const canExpense = useHasPermission(PERMISSIONS.EXPENSES_MANAGE);
  const available: PurchaseKind[] = [...(viewOrders ? ['orders', 'receipts'] as const : []), ...(viewBills ? ['bills'] as const : []), ...(viewExpenses ? ['expenses'] as const : [])];
  const requested = params.get('tab') as PurchaseKind; const kind = available.includes(requested) ? requested : available[0] ?? 'orders'; const selectedId = Number(params.get('documentId')) || undefined; const supplierId = params.get('supplierId') || undefined;
  const sorting = useTableSort([{ key: 'id', label: 'Record number' }, { key: 'createdAt', label: 'Created date' }, { key: kind === 'orders' ? 'orderNumber' : kind === 'bills' ? 'supplierReference' : 'reference', label: 'Document reference' }, ...(kind === 'receipts' ? [] : [{ key: 'status', label: 'Status' }, { key: 'total', label: 'Total' }]), ...(kind === 'bills' ? [{ key: 'billDate', label: 'Bill date' }, { key: 'dueDate', label: 'Due date' }] : kind === 'expenses' ? [{ key: 'expenseDate', label: 'Expense date' }] : kind === 'orders' ? [{ key: 'expectedDate', label: 'Expected receipt date' }] : [])], { onChange: () => setPage(1) });
  const scope = purchasingKeys.firm(firmId);
  const validRange = !from || !to || from <= to;
  const filters = { page, limit: 20, sortBy: sorting.sortBy, sortOrder: sorting.sortOrder, supplierId, from: from || undefined, to: to || undefined };
  const query = useQuery({ queryKey: [...scope, kind, filters], queryFn: ({ signal }) => listPurchases(kind, filters, signal), enabled: firmId != null && available.includes(kind) && validRange });
  const detail = useQuery({ queryKey: [...scope, kind, 'detail', selectedId], queryFn: ({ signal }) => getPurchase(kind, selectedId!, signal), enabled: firmId != null && !!selectedId && available.includes(kind) });
  const optionsKind = kind === 'receipts' ? 'orders' : kind;
  const canCreate = kind !== 'receipts' && (kind === 'orders' ? canPurchase : kind === 'bills' ? canBill : canExpense);
  const options = useQuery({ queryKey: [...scope, 'options', optionsKind, ''], queryFn: ({ signal }) => purchaseOptions(optionsKind, '', signal), enabled: firmId != null && available.includes(kind) && canCreate });
  const [formVersion, setFormVersion] = useState(0);
  const refresh = async () => { setFormVersion((value) => value + 1); await Promise.all([cache.invalidateQueries({ queryKey: scope }), cache.invalidateQueries({ queryKey: ['inventory', firmId] })]); };
  const select = (id?: number, nextKind = kind) => { if (nextKind !== kind) setPage(1); setParams((current) => { const next = new URLSearchParams(current); next.set('tab', nextKind); if (id) next.set('documentId', String(id)); else next.delete('documentId'); return next; }); };
  const createAction = options.data && kind !== 'receipts' && canCreate ? <CreatePurchaseForm key={`${kind}:${formVersion}`} kind={kind} options={options.data} saved={refresh} /> : undefined;
  return <PageContainer><PageHeader actions={createAction} title="Purchasing & expenses" description="Supplier purchasing and payables stay separate from customer sales" />
    <WorkspaceTabs value={kind} label="Purchasing records" items={available.map((value) => ({ value, label: labels[value] }))} onChange={(value) => select(undefined, value)} />
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}><TextField label="From date" type="date" InputLabelProps={{ shrink: true }} value={from} inputProps={{ max: to || undefined }} onChange={(event) => { setFrom(event.target.value); setPage(1); }} /><TextField label="Through date" type="date" InputLabelProps={{ shrink: true }} value={to} inputProps={{ min: from || undefined }} onChange={(event) => { setTo(event.target.value); setPage(1); }} /></Stack>
    {!validRange ? <Alert severity="error">From date must be on or before Through date.</Alert> : null}
    {supplierId ? <AppButton onClick={() => setParams({ tab: kind })}>Clear supplier filter</AppButton> : null}
    {[query.error, detail.error, options.error].filter(Boolean).map((error, index) => <Alert key={index} severity="error">{toApiError(error).message}</Alert>)}
    {query.isFetching ? <Typography role="status">Loading purchasing documents…</Typography> : null}
    {query.data && validRange ? <RecordTable rows={query.data.records} sorting={sorting} rowNumberStart={(page - 1) * 20 + 1} label={labels[kind]} rowKey={(row) => row.id} emptyMessage={`No ${labels[kind].toLowerCase()} match these filters.`} columns={[
      { key: 'reference', sortKey: kind === 'orders' ? 'orderNumber' : kind === 'bills' ? 'supplierReference' : 'reference', label: 'Document', render: (row) => row.orderNumber ?? row.supplierReference ?? row.reference ?? `Receipt #${row.id}` },
      { key: 'supplier', label: 'Supplier', render: supplierName },
      { key: 'date', label: kind === 'orders' ? 'Expected receipt' : kind === 'receipts' ? 'Received on' : kind === 'bills' ? 'Bill date' : 'Expense date', sortKey: kind === 'orders' ? 'expectedDate' : kind === 'receipts' ? 'createdAt' : kind === 'bills' ? 'billDate' : 'expenseDate', render: (row) => (row.expectedDate ?? row.billDate ?? row.expenseDate ?? (kind === 'receipts' ? row.createdAt : undefined))?.slice(0, 10) ?? 'Not specified' },
      { key: 'status', label: 'Status', sortKey: kind === 'receipts' ? undefined : 'status', render: (row) => <AppStatusChip label={formatRecordStatus(row.status ?? (row.cancelledAt ? 'CANCELLED' : 'RECEIVED'))} variant={row.status === 'VOID' || row.cancelledAt ? 'error' : row.status === 'DRAFT' ? 'neutral' : 'success'} /> },
      { key: 'total', label: 'Total', sortKey: kind === 'receipts' ? undefined : 'total', align: 'right', render: (row) => row.total !== undefined ? `${row.currency ?? ''} ${row.financialSnapshot?.total ?? row.snapshot?.total ?? row.total}` : 'Not applicable' },
      { key: 'actions', label: 'Actions', render: (row) => <AppButton onClick={() => select(row.id)}>Open {row.orderNumber ?? row.supplierReference ?? row.reference ?? `receipt #${row.id}`}</AppButton> },
    ]} /> : null}
    {options.isError && canCreate ? <AppButton onClick={() => void options.refetch()}>Retry record choices</AppButton> : null}
    {query.isError ? <AppButton onClick={() => void query.refetch()}>Retry purchasing records</AppButton> : null}
    <Paging pagination={query.data?.pagination} page={page} change={setPage} />
    {query.data?.totals?.map((row) => <Typography key={`${row.currency}:${row.category ?? ''}`}>Confirmed {row.category ?? 'supplier bills'} · {row.currency} {row._sum.total}</Typography>)}
    <AppDialog open={selectedId !== undefined} title={`${recordLabels[kind]} #${selectedId ?? ''}`} onClose={() => select()} showCloseButton fullScreen={compact} contentDividers fullWidth maxWidth="lg">
      {detail.isPending ? <Typography role="status">Loading document…</Typography> : detail.isError ? <Alert severity="error" action={<AppButton onClick={() => void detail.refetch()}>Retry</AppButton>}>{toApiError(detail.error).message}</Alert> : detail.data ? <PurchaseDetails key={`${kind}:${detail.data.id}:${detail.data.version ?? detail.data.cancelledAt ?? 'recorded'}:${formVersion}`} kind={kind} row={detail.data} canPurchase={canPurchase} canApprove={canApprove} canBill={canBill} canExpense={canExpense} saved={async () => { select(); await refresh(); }} /> : null}
    </AppDialog>
    {kind === 'receipts' ? <Typography>Select an approved purchase order in Purchase orders to record a partial or full receipt.</Typography> : null}
  </PageContainer>;
}
function TaxField({ options }: { options: PurchaseOptions }) { const [taxMode, setTaxMode] = useState('NONE'); return <TextField name="taxMode" select label="Supplier document tax treatment" value={taxMode} onChange={(event) => setTaxMode(event.target.value)}><MenuItem value="NONE">No tax</MenuItem>{(options.financial.policy.tax.id === 'india-gst' || options.receiptLines.some((line) => line.taxMode !== 'NONE') || taxMode !== 'NONE') ? [<MenuItem key="local" value="CGST_SGST">India GST — CGST / SGST</MenuItem>, <MenuItem key="inter" value="IGST">India GST — IGST</MenuItem>] : null}</TextField>; }
function CreatePurchaseForm({ kind, options: initialOptions, saved }: { kind: 'orders' | 'bills' | 'expenses'; options: PurchaseOptions; saved: () => Promise<unknown> }) {
  const firmId = useFirmId();
  const [search, setSearch] = useState('');
  const choices = useQuery({ queryKey: [...purchasingKeys.firm(firmId), 'options', kind, search], queryFn: ({ signal }) => purchaseOptions(kind, search, signal), enabled: firmId != null && search.length > 0, placeholderData: (previous) => previous });
  const options = search ? choices.data ?? initialOptions : initialOptions;
  const [supplierId, setSupplierId] = useState('');
  const [documentDate, setDocumentDate] = useState(billingDateToday);
  const [selectedSupplier, setSelectedSupplier] = useState<{ id: number; name: string } | null>(null);
  const contextualOptions = { ...options, receiptLines: options.receiptLines.filter((row) => row.supplierId === Number(supplierId)) };
  return <CommandForm dialog maxWidth="md" isSubmitDisabled={!!search && (choices.isFetching || choices.isError)} title={kind === 'orders' ? 'Create purchase order draft' : kind === 'bills' ? 'Create supplier bill draft' : 'Record standalone expense'} onClosed={() => { setSearch(''); setSupplierId(''); setSelectedSupplier(null); setDocumentDate(billingDateToday()); }} saved={saved} submit={(data, idempotencyKey) => purchaseCommand(kind, kind === 'expenses' ? { supplierId: optional(data, 'supplierId') ? Number(text(data, 'supplierId')) : undefined, reference: text(data, 'reference'), expenseDate: text(data, 'date'), category: text(data, 'category'), description: text(data, 'description'), amount: text(data, 'amount'), taxRate: text(data, 'taxRate'), taxMode: text(data, 'taxMode'), idempotencyKey } : { supplierId: Number(text(data, 'supplierId')), ...(kind === 'orders' ? { expectedDate: optional(data, 'expectedDate') } : { supplierReference: text(data, 'reference'), billDate: text(data, 'date'), dueDate: optional(data, 'dueDate') }), taxMode: text(data, 'taxMode'), lines: purchaseLines(data, kind), idempotencyKey })}>
    <TextField label={kind === 'orders' ? 'Find suppliers or items' : kind === 'bills' ? 'Find suppliers or receipts' : 'Find suppliers'} value={search} onChange={(event) => setSearch(event.target.value)} inputProps={{ maxLength: 191 }} helperText="Search to find choices for this record. Your selected choices and entered values are kept." />
    {search && choices.isFetching ? <Typography role="status">Finding record choices…</Typography> : null}
    {search && choices.isError ? <Alert severity="error" action={<AppButton onClick={() => void choices.refetch()}>Retry</AppButton>}>{toApiError(choices.error).message} Clear the search to return to the original choices.</Alert> : null}
    <Typography variant="body2" color="text.secondary">Default currency {options.financial.policy.currency}. Select the tax treatment shown on the supplier document. {kind === 'expenses' ? 'Record an expense here only if it is not already included in a supplier bill.' : kind === 'bills' ? 'Receipt matches keep their approved currency. Record each purchase only once.' : 'Approved orders can be received in full or in parts.'}</Typography>
    {options.suppliers.length === 0 ? <Alert severity="info">No matching suppliers. Add an active company with “Also a supplier” enabled, or change the search above.</Alert> : null}
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}><TextField name="supplierId" select label="Supplier" value={supplierId} onChange={(event) => { setSupplierId(event.target.value); setSelectedSupplier(options.suppliers.find((row) => row.id === Number(event.target.value)) ?? null); }} required={kind !== 'expenses'}><MenuItem value="">{kind === 'expenses' ? 'No supplier linked' : 'Select supplier'}</MenuItem>{selectedSupplier && !options.suppliers.some((row) => row.id === selectedSupplier.id) ? <MenuItem value={selectedSupplier.id}>{selectedSupplier.name}</MenuItem> : null}{options.suppliers.map((supplier) => <MenuItem key={supplier.id} value={supplier.id}>{supplier.name}</MenuItem>)}</TextField>
    <TaxField options={contextualOptions} /></Box>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: kind === 'bills' ? 'repeat(3, minmax(0, 1fr))' : 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>{kind === 'orders' ? <TextField name="expectedDate" label="Expected receipt date" type="date" InputLabelProps={{ shrink: true }} /> : <><TextField name="reference" label={kind === 'bills' ? 'Supplier bill reference' : 'Expense reference'} required inputProps={{ maxLength: kind === 'bills' ? 100 : 191 }} /><TextField name="date" label={kind === 'bills' ? 'Bill date' : 'Expense date'} type="date" required value={documentDate} onChange={(event) => setDocumentDate(event.target.value)} InputLabelProps={{ shrink: true }} />{kind === 'bills' ? <TextField name="dueDate" label="Due date" type="date" inputProps={{ min: documentDate || undefined }} InputLabelProps={{ shrink: true }} /> : null}</>}</Box>
    {kind === 'expenses' ? <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}><TextField name="category" label="Expense category" required inputProps={{ minLength: 2, maxLength: 100 }} /><TextField name="description" label="Expense description" required inputProps={{ minLength: 2, maxLength: 2000 }} /><TextField name="amount" label="Net expense amount" required inputProps={{ inputMode: 'decimal', pattern: '\\d+(\\.\\d{1,3})?' }} /><TextField name="taxRate" label="Expense tax percentage" defaultValue="0" required /></Box> : <PurchaseLineFields key={kind === 'bills' ? supplierId : kind} kind={kind} options={contextualOptions} />}
  </CommandForm>;
}
function PurchaseDetails({ kind, row, canPurchase, canApprove, canBill, canExpense, saved }: { kind: PurchaseKind; row: PurchaseDocument; canPurchase: boolean; canApprove: boolean; canBill: boolean; canExpense: boolean; saved: () => Promise<unknown> }) {
  const firmId = useFirmId();
  const [returnPage, setReturnPage] = useState(1);
  const sorting = useTableSort([{ key: 'id', label: 'Return number' }, { key: 'quantity', label: 'Quantity' }, { key: 'createdAt', label: 'Returned date' }], { paramPrefix: 'returns', onChange: () => setReturnPage(1) });
  const returns = useQuery({ queryKey: [...purchasingKeys.firm(firmId), 'receipt-returns', row.id, returnPage, sorting.sortBy, sorting.sortOrder], queryFn: ({ signal }) => listReceiptReturns(row.id, returnPage, signal, { sortBy: sorting.sortBy, sortOrder: sorting.sortOrder }), enabled: kind === 'receipts' && firmId != null });
  const parent = useQuery({ queryKey: [...purchasingKeys.firm(firmId), 'receipt-order', row.purchaseOrderId], queryFn: ({ signal }) => getPurchase('orders', row.purchaseOrderId!, signal), enabled: kind === 'receipts' && !!row.purchaseOrderId && canPurchase });
  const reason = <TextField name="reason" label="Document action reason" required inputProps={{ minLength: 5, maxLength: 2000 }} />;
  const financial = row.financialSnapshot ?? row.snapshot;
  const transition = (action: 'approve' | 'post' | 'cancel' | 'void') => {
    const title = action === 'approve' ? 'Approve purchase order' : action === 'post' ? 'Confirm supplier bill' : kind === 'orders' ? 'Cancel purchase order' : 'Cancel supplier bill';
    return <CommandForm dialog title={`${title} #${row.id}`} label={title} cancelLabel={action === 'cancel' || action === 'void' ? 'Keep document' : undefined} submitColor={action === 'cancel' || action === 'void' ? 'error' : 'primary'} successMessage={`${action === 'approve' ? 'Purchase order approved' : action === 'post' ? 'Supplier bill confirmed' : 'Document cancelled'}.`} confirmation={{ title: `${title} #${row.id}?`, description: action === 'post' ? 'This adds the bill to the amount you owe the supplier. Review the supplier and amounts before continuing.' : action === 'approve' ? 'Approval allows goods to be received against this purchase order.' : 'The original document and reason are kept. Any amounts owed or stock affected by cancellation are updated.', color: action === 'cancel' || action === 'void' ? 'warning' : 'primary' }} saved={saved} submit={(data) => purchaseCommand(kind, { expectedVersion: row.version, reason: text(data, 'reason') }, `/${row.id}/${action}`)}>{reason}</CommandForm>;
  };
  const status = row.status ?? (row.cancelledAt ? 'CANCELLED' : 'RECEIVED');
  const currency = row.currency ?? row.order?.currency;
  return <Stack spacing={3}>
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}><Typography component="h3" variant="h3" sx={{ overflowWrap: 'anywhere' }}>{row.orderNumber ?? row.supplierReference ?? row.reference ?? `Receipt #${row.id}`}</Typography><AppStatusChip label={formatRecordStatus(status)} variant={status === 'CANCELLED' || status === 'VOID' ? 'error' : status === 'DRAFT' ? 'neutral' : 'success'} /></Box>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) minmax(280px, 0.75fr)' }, gap: 3, alignItems: 'start' }}>
      <DetailSection title="Document details"><DetailFields fields={[
        { label: 'Supplier', value: supplierName(row) }, { label: 'Currency', value: currency || 'Not applicable' },
        { label: kind === 'orders' ? 'Expected receipt date' : kind === 'receipts' ? 'Received on' : kind === 'bills' ? 'Bill date' : 'Expense date', value: (row.expectedDate ?? row.billDate ?? row.expenseDate ?? (kind === 'receipts' ? row.createdAt : undefined))?.slice(0, 10) || 'Not specified' },
        ...(kind === 'bills' ? [{ label: 'Due date', value: row.dueDate?.slice(0, 10) || 'Not specified' }] : []),
        ...(row.order ? [{ label: 'Purchase order', value: row.order.orderNumber }] : []),
        ...(row.warehouse ? [{ label: 'Warehouse', value: `${row.warehouse.name} (${row.warehouse.code})` }] : []),
        ...(row.category ? [{ label: 'Category', value: row.category }] : []), ...(row.description || row.snapshot?.lines?.length ? [{ label: 'Description', value: row.description || row.snapshot?.lines?.map((line) => line.description).join('\n') }] : []),
      ]} /></DetailSection>
      {row.total !== undefined ? <DetailSection title="Totals"><AmountSummary rows={[
        ...(financial ? [{ label: 'Net amount', value: financial.subtotal }, { label: 'Tax', value: financial.taxAmount }, { label: 'Round off', value: financial.roundOffAmount }] : []),
        { label: 'Total', value: `${currency ?? ''} ${financial?.total ?? row.total}`, emphasis: true },
      ]} /></DetailSection> : <Alert severity="info">A goods receipt records quantities and stock. Supplier bill values are recorded separately.</Alert>}
    </Box>
    {row.lines ? <DetailSection title="Line items"><RecordTable rows={row.lines} label="Purchase document lines" rowKey={(line) => line.id} columns={[
      { key: 'line', label: 'Line', sortValue: (line) => line.lineNumber ?? line.orderLine?.lineNumber ?? line.id, render: (line) => line.lineNumber ?? line.orderLine?.lineNumber ?? line.id },
      { key: 'description', label: 'Item / description', sortValue: (line) => line.snapshot?.itemName ?? line.snapshot?.description ?? line.orderLine?.snapshot.itemName, render: (line) => {
        const item = line.snapshot?.itemName ?? line.orderLine?.snapshot.itemName;
        const description = line.snapshot?.description ?? line.orderLine?.snapshot.description;
        return <Stack spacing={0.5}><Typography variant="body2" fontWeight={600}>{item ?? description ?? `Purchase line #${line.purchaseOrderLineId}`}</Typography>{item && description && item !== description ? <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>{description}</Typography> : null}</Stack>;
      } },
      { key: 'quantity', label: 'Quantity', align: 'right', sortValue: (line) => line.quantity, render: (line) => line.quantity },
      ...(kind === 'orders' || kind === 'receipts' ? [{ key: 'received', label: kind === 'receipts' ? 'Returned' : 'Received', align: 'right' as const, sortValue: (line: NonNullable<PurchaseDocument['lines']>[number]) => kind === 'receipts' ? line.returnedQuantity : line.receivedQuantity, render: (line: NonNullable<PurchaseDocument['lines']>[number]) => (kind === 'receipts' ? line.returnedQuantity : line.receivedQuantity) ?? '0' }] : []),
      { key: 'cost', label: 'Unit cost', align: 'right', sortValue: (line) => line.unitCost ?? line.snapshot?.unitCost ?? line.orderLine?.unitCost, render: (line) => line.unitCost ?? line.snapshot?.unitCost ?? line.orderLine?.unitCost ?? '—' },
    ]} /></DetailSection> : null}
    {kind === 'receipts' ? <DetailSection title="Supplier return history">{returns.isPending ? <Typography role="status">Loading supplier returns…</Typography> : returns.isError ? <Alert severity="error" action={<AppButton onClick={() => void returns.refetch()}>Retry returns</AppButton>}>{toApiError(returns.error).message}</Alert> : <RecordTable rows={returns.data.records} sorting={sorting} rowNumberStart={(returnPage - 1) * 20 + 1} label="Supplier return history" rowKey={(record) => record.id} emptyMessage="No goods returned from this receipt." columns={[
      { key: 'return', label: 'Return', sortKey: 'id', render: (record) => `#${record.id}` }, { key: 'line', label: 'Receipt line', render: (record) => `#${record.receiptLineId}` },
      { key: 'quantity', label: 'Quantity', align: 'right', sortKey: 'quantity', render: (record) => record.quantity }, { key: 'reason', label: 'Reason', render: (record) => record.reason },
      { key: 'date', label: 'Returned at', sortKey: 'createdAt', render: (record) => new Date(record.createdAt).toLocaleString() },
    ]} />}<Paging pagination={returns.data?.pagination} page={returnPage} change={setReturnPage} /></DetailSection> : null}
    <DetailActions label="Purchasing document actions">
    {kind === 'orders' && row.status === 'DRAFT' && canApprove ? transition('approve') : null}
    {kind === 'orders' && row.status !== 'CANCELLED' && row.status !== 'RECEIVED' && canPurchase ? transition('cancel') : null}
    {kind === 'bills' && row.status === 'DRAFT' && canBill ? transition('post') : null}
    {kind === 'bills' && row.status !== 'VOID' && canBill ? transition('void') : null}
    {kind === 'expenses' && row.status !== 'VOID' && canExpense ? <CommandForm dialog title={`Cancel expense #${row.id}`} label="Cancel expense" cancelLabel="Keep expense" submitColor="error" successMessage="Expense cancelled." confirmation={{ title: `Cancel expense #${row.id}?`, description: 'This removes the amount from your recorded expenses. The original record and reason are kept.', color: 'warning' }} saved={saved} submit={(data) => purchaseCommand('expenses', { reason: text(data, 'reason') }, `/${row.id}/void`)}>{reason}</CommandForm> : null}
    {kind === 'orders' && ['APPROVED', 'PARTIALLY_RECEIVED'].includes(row.status ?? '') && canPurchase ? <CommandForm dialog title="Receive purchase order" confirmation={{ title: "Record goods receipt?", description: "The entered quantities will be received against this order. Tracked goods update the receiving warehouse stock." }} saved={saved} submit={(data, idempotencyKey) => purchaseCommand('receipts', { purchaseOrderId: row.id, expectedVersion: row.version, warehouseId: optional(data, 'warehouseId') ? Number(text(data, 'warehouseId')) : undefined, reference: text(data, 'reference'), lines: row.lines?.flatMap((line) => { const quantity = text(data, `receive_${line.id}`); return quantity && /[1-9]/.test(quantity) ? [{ purchaseOrderLineId: line.id, quantity }] : []; }), idempotencyKey })}><TextField name="reference" label="Receipt reference" required />{row.lines?.some((line) => line.snapshot?.stockTracking) ? <><Typography>Choose the receiving warehouse for tracked goods.</Typography><WarehouseField name="warehouseId" label="Receiving warehouse" context="purchasing" load={(search, signal) => purchaseOptions('orders', '', signal, search).then((data) => data.warehouses)} /></> : null}{row.lines?.map((line) => <TextField key={line.id} name={`receive_${line.id}`} label={`Receive ${line.snapshot?.itemName ?? `line #${line.id}`}`} helperText={`${line.quantity} ordered; ${line.receivedQuantity} received${line.snapshot?.stockTracking ? '; select a warehouse for tracked stock' : ''}`} inputProps={{ inputMode: 'decimal', pattern: '\\d+(\\.\\d{1,3})?' }} />)}</CommandForm> : null}
    {kind === 'receipts' && !row.cancelledAt && canPurchase ? <><CommandForm dialog title={`Return goods from receipt #${row.id}`} confirmation={{ title: "Record supplier return?", description: "This returns the entered quantity from this receipt and updates tracked stock.", color: "warning" }} saved={saved} submit={(data, idempotencyKey) => purchaseCommand('receipts', { receiptLineId: Number(text(data, 'receiptLineId')), quantity: text(data, 'quantity'), reason: text(data, 'reason'), idempotencyKey }, `/${row.id}/returns`)}><TextField name="receiptLineId" select label="Receipt line to return" required defaultValue=""><MenuItem value="" disabled>Select receipt line</MenuItem>{row.lines?.map((line) => <MenuItem key={line.id} value={line.id}>Line #{line.id} · {line.quantity} received; {line.returnedQuantity} returned</MenuItem>)}</TextField><TextField name="quantity" label="Return quantity" required inputProps={{ inputMode: 'decimal', pattern: '\\d+(\\.\\d{1,3})?' }} />{reason}</CommandForm>{parent.data?.version ? <CommandForm dialog title={`Cancel receipt #${row.id}`} confirmation={{ title: `Cancel receipt #${row.id}?`, description: "This reverses this receipt and updates tracked stock. Its history is retained.", color: "warning" }} saved={saved} submit={(data) => purchaseCommand('receipts', { expectedVersion: parent.data!.version, reason: text(data, 'reason') }, `/${row.id}/cancel`)}>{reason}</CommandForm> : null}{parent.isError ? <Alert severity="error">{toApiError(parent.error).message}</Alert> : null}</> : null}
    </DetailActions>
  </Stack>;
}

function purchaseLines(data: FormData, kind: 'orders' | 'bills') {
  const count = Number(data.get('lineCount'));
  return Array.from({ length: count }, (_, index) => {
    const field = (name: string) => String(data.get(`line_${index}_${name}`) ?? '').trim();
    return { description: field('description'), quantity: field('quantity'), unitCost: field('unitCost'), taxRate: field('taxRate'), ...(field('expenseCategory') ? { expenseCategory: field('expenseCategory') } : {}), ...(kind === 'orders' ? { itemId: Number(field('itemId')) } : field('receiptId') ? { goodsReceiptLineId: Number(field('receiptId')) } : {}) };
  });
}
