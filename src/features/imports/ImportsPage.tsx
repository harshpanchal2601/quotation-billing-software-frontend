import { Alert, MenuItem, Stack, TextField, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { PERMISSIONS, useAuth, useHasPermission } from '@features/auth';
import { getCategoryOptionsRequest } from '@features/categories';
import { getMeasurementUnitOptionsRequest } from '@features/measurement-units';
import { toApiError } from '@shared/api/apiClient';
import { ErrorState } from '@shared/components/common/ErrorState';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { formatRecordStatus } from '@shared/ui/display';
import { AppButton } from '@shared/ui/actions';
import { CommandForm } from '@shared/forms/CommandForm';
import { AppDialog, ConfirmDialog } from '@shared/ui/dialogs';
import { useNotification } from '@shared/ui/feedback';
import { RecordPagination, RecordTable, useTableSort } from '@shared/ui/tables';
import { DetailActions, DetailFields, DetailSection, PageContainer, PageHeader } from '@shared/ui/layout';
import { commitImport, compensateImport, importKeys, loadImport, loadImports, previewImport, type ImportDetail, type ImportTarget } from './imports.api';

export function ImportsPage() {
  const firmId = useFirmId(); const { user } = useAuth();
  return <ImportWorkspace key={`${firmId}:${user?.id}`} />;
}

function ImportWorkspace() {
  const compact = useMediaQuery(useTheme().breakpoints.down('sm'));
  const firmId = useFirmId(); const { user } = useAuth(); const cache = useQueryClient();
  const canCustomers = useHasPermission(PERMISSIONS.COMPANIES_MANAGE);
  const canItems = useHasPermission(PERMISSIONS.ITEMS_MANAGE);
  const [target, setTarget] = useState<ImportTarget>(canCustomers ? 'CUSTOMERS' : 'ITEMS');
  const [csv, setCsv] = useState(''); const [selected, setSelected] = useState<number>(); const [page, setPage] = useState(1);
  const notify = useNotification(); const [confirmation, setConfirmation] = useState<'commit' | number | null>(null);
  const sorting = useTableSort([{ key: 'id', label: 'Batch number' }, { key: 'startedAt', label: 'Started date' }, { key: 'target', label: 'Target' }, { key: 'status', label: 'Status' }, { key: 'totalRecords', label: 'Rows' }], { onChange: () => setPage(1) });
  const scope = importKeys(firmId, user?.id);
  const batches = useQuery({ queryKey: [...scope, 'list', page, sorting.sortBy, sorting.sortOrder], queryFn: ({ signal }) => loadImports(page, signal, { sortBy: sorting.sortBy, sortOrder: sorting.sortOrder }), enabled: firmId != null, retry: false });
  const detail = useQuery({ queryKey: [...scope, 'detail', selected], queryFn: ({ signal }) => loadImport(selected!, signal), enabled: firmId != null && selected !== undefined, retry: false });
  const previewed = useRef<ImportDetail>();
  const actionLock = useRef(false); const dismissFailure = useRef<(() => void) | null>(null);
  const refresh = async () => { try { await cache.invalidateQueries({ queryKey: scope }, { throwOnError: true }); } catch { notify('Import results were saved, but records could not refresh. Reload the selected batch.', 'warning'); } };
  const accept = async (result: ImportDetail) => { cache.setQueryData([...scope, 'detail', result.batch.id], result); setSelected(result.batch.id); await refresh(); };
  const failed = (error: unknown) => { dismissFailure.current?.(); dismissFailure.current = notify(toApiError(error).message, 'error'); };
  const saved = async (result: ImportDetail) => { dismissFailure.current?.(); dismissFailure.current = null; setConfirmation(null); notify('Import batch updated. Review the row outcomes.'); await accept(result); };
  const settled = () => { actionLock.current = false; };
  const commit = useMutation({ mutationFn: () => commitImport(detail.data!.batch), onSuccess: saved, onError: failed, onSettled: settled });
  const compensate = useMutation({ mutationFn: (rowId: number) => compensateImport(detail.data!.batch, rowId), onSuccess: saved, onError: failed, onSettled: settled });
  const busy = commit.isPending || compensate.isPending;
  const allowed = target === 'CUSTOMERS' ? canCustomers : canItems;
  const header = target === 'CUSTOMERS' ? 'externalId,name,legalName,gstin,pan,website,notes' : 'externalId,name,categoryId,measurementUnitId,defaultRate,gstRate,hsnCode,kind,shortDescription';
  const createImport = <CommandForm dialog maxWidth="md" title="New import" label="Preview import" successMessage="Import preview ready. Review each row before committing." isSubmitDisabled={!csv.trim() || !allowed} onClosed={() => setCsv('')} submit={async (data) => { previewed.current = await previewImport(String(data.get('target')) as ImportTarget, String(data.get('csv'))); }} saved={() => accept(previewed.current!)}>
    <Typography>Paste UTF-8 CSV with a header and up to 500 data rows (512 KB). Optional columns may be omitted. Imports create records; they do not update existing records.</Typography>
    <TextField select name="target" label="Import target" value={target} onChange={(event) => { setTarget(event.target.value as ImportTarget); setCsv(''); }}><MenuItem value="CUSTOMERS" disabled={!canCustomers}>Customers</MenuItem><MenuItem value="ITEMS" disabled={!canItems}>Items</MenuItem></TextField>
    <Typography component="code" sx={{ overflowWrap: 'anywhere' }}>{header}</Typography>
    <TextField name="csv" label="CSV content" multiline minRows={6} required value={csv} onChange={(event) => setCsv(event.target.value)} inputProps={{ maxLength: 512_000 }} helperText="Use the headers above. Quote cells containing commas, line breaks or quotes. Item category and unit IDs must belong to this firm." />
    {target === 'ITEMS' && canItems ? <ItemImportReferences /> : null}
  </CommandForm>;
  return <PageContainer>
    <PageHeader title="Customer and item imports" description="Preview CSV rows before committing them to the selected firm" actions={canCustomers || canItems ? createImport : undefined} />
    {!canCustomers && !canItems ? <Alert severity="info">Customer or item management permission and the corresponding plan feature are required to import records.</Alert> : null}
    {batches.isPending ? <Typography role="status">Loading import batches…</Typography> : null}
    {batches.isError ? <ErrorState message={toApiError(batches.error).message} onRetry={() => void batches.refetch()} /> : null}
    {[commit.error, compensate.error].filter(Boolean).map((error, index) => <ErrorState key={index} message={toApiError(error).message} />)}
    {busy ? <Typography role="status">Processing import… Keep this page open. Reload the batch after a connection error before retrying.</Typography> : null}
    <Typography component="h2" variant="h2">Your import batches</Typography>
    {batches.data ? <><RecordTable rows={batches.data.batches} sorting={sorting} rowNumberStart={(page - 1) * 20 + 1} label="Import batches" rowKey={(batch) => batch.id} emptyMessage="No import batches yet. Preview a CSV to review its rows." columns={[
      { key: 'id', sortKey: 'id', label: 'Batch', render: (batch) => `#${batch.id}` }, { key: 'target', sortKey: 'target', label: 'Target', render: (batch) => formatRecordStatus(batch.target) }, { key: 'status', sortKey: 'status', label: 'Status', render: (batch) => formatRecordStatus(batch.status) },
      { key: 'rows', sortKey: 'totalRecords', label: 'Rows', align: 'right', render: (batch) => batch.totalRecords }, { key: 'imported', label: 'Imported', align: 'right', render: (batch) => batch.successfulRecords }, { key: 'failed', label: 'Rejected / failed', align: 'right', render: (batch) => batch.failedRecords },
      { key: 'startedAt', sortKey: 'startedAt', label: 'Started', render: (batch) => new Date(batch.startedAt).toLocaleString() }, { key: 'actions', label: 'Actions', render: (batch) => <AppButton disabled={busy} onClick={() => setSelected(batch.id)}>Review batch #{batch.id}</AppButton> },
    ]} /><RecordPagination pagination={batches.data.pagination} page={page} change={setPage} /></> : null}
    <AppDialog open={selected !== undefined} title={`Review import #${selected ?? ''}`} fullWidth maxWidth="lg" preventClose={busy} onClose={() => { if (!actionLock.current) setSelected(undefined); }} showCloseButton fullScreen={compact}>
    {detail.isPending ? <Typography role="status">Loading import rows…</Typography> : null}
    {detail.isError ? <ErrorState message={toApiError(detail.error).message} onRetry={() => void detail.refetch()} /> : null}
    {detail.data ? <Stack spacing={2}>
      <DetailSection title="Import details"><DetailFields fields={[
        { label: 'Import type', value: formatRecordStatus(detail.data.batch.target) }, { label: 'Status', value: formatRecordStatus(detail.data.batch.status) },
        { label: 'Total rows', value: detail.data.batch.totalRecords }, { label: 'Imported', value: detail.data.batch.successfulRecords },
        { label: 'Rejected or failed', value: detail.data.batch.failedRecords }, { label: 'Started', value: new Date(detail.data.batch.startedAt).toLocaleString() },
      ]} /></DetailSection>
      <Alert severity="info">Approved rows are imported independently. A failed row does not undo earlier successful rows. Undoing an import deactivates the unchanged imported record and preserves its business history; changed records require manual review.</Alert>
      <DetailActions label="Import actions"><AppButton disabled={busy || detail.isFetching} onClick={() => void detail.refetch()}>Refresh import</AppButton><AppButton variant="contained" disabled={busy || detail.isFetching || !detail.data.rows.some((row) => row.status === 'APPROVED')} onClick={() => setConfirmation('commit')}>Import approved rows</AppButton></DetailActions>
      <DetailSection title="Row results"><RecordTable rows={detail.data.rows} label="Import preview and results" rowKey={(row) => row.id} columns={[
        { key: 'identifier', label: 'External identifier', sortValue: (row) => row.sourceIdentifier, render: (row) => row.sourceIdentifier ?? 'Invalid identifier' }, { key: 'name', label: 'Name', sortValue: (row) => row.rawData.name, render: (row) => row.rawData.name },
        { key: 'status', label: 'Status', sortValue: (row) => row.compensatedAt ? 'COMPENSATED' : row.status, render: (row) => row.compensatedAt ? 'Import undone' : formatRecordStatus(row.status) }, { key: 'result', label: 'Result', render: (row) => row.errorMessage ?? (row.targetId ? `Created record #${row.targetId}` : 'Not imported') },
        { key: 'actions', label: 'Actions', render: (row) => row.status === 'IMPORTED' && !row.compensatedAt ? <AppButton color="warning" disabled={busy || detail.isFetching} onClick={() => setConfirmation(row.id)}>Deactivate imported record</AppButton> : '—' },
      ]} /></DetailSection>
    </Stack> : null}
    </AppDialog>
    <ConfirmDialog open={confirmation !== null} title={confirmation === 'commit' ? 'Import approved rows?' : 'Deactivate imported record?'} confirmLabel={confirmation === 'commit' ? 'Import approved rows' : 'Deactivate record'} confirmColor={confirmation === 'commit' ? 'primary' : 'warning'} isConfirming={busy} onClose={() => { if (!actionLock.current) setConfirmation(null); }} onConfirm={() => { if (actionLock.current || busy || !detail.data || detail.isFetching || confirmation === null) return; actionLock.current = true; if (confirmation === 'commit') commit.mutate(); else compensate.mutate(confirmation); }}>{confirmation === 'commit' ? 'Approved rows create customer or item records independently. Review every result after processing; a failed row does not undo earlier successful rows.' : 'The unchanged imported record will be deactivated. Business history is retained, and changed records require manual review.'}</ConfirmDialog>
  </PageContainer>;
}

function ItemImportReferences() {
  const firmId = useFirmId(); const { user } = useAuth();
  const query = useQuery({ queryKey: [...importKeys(firmId, user?.id), 'item-references'], queryFn: async () => { const [units, categories] = await Promise.all([getMeasurementUnitOptionsRequest(), getCategoryOptionsRequest()]); return { units, categories }; }, enabled: firmId != null });
  return <DetailSection title="Item reference guide" description="Use these reference numbers in your CSV. Leave categoryId empty to use Uncategorised. Reference numbers can differ between firms.">
    {query.isPending ? <Typography role="status">Loading item references…</Typography> : query.isError ? <ErrorState message={toApiError(query.error).message} onRetry={() => void query.refetch()} /> : <>
      <RecordTable label="Import measurement unit references" rows={query.data.units} rowKey={(unit) => unit.id} emptyMessage="No active units. Create a measurement unit before importing items." columns={[
        { key: 'id', label: 'measurementUnitId', sortValue: (unit) => unit.id, render: (unit) => unit.id }, { key: 'name', label: 'Unit', sortValue: (unit) => unit.name, render: (unit) => `${unit.name} (${unit.symbol})` },
      ]} />
      <RecordTable label="Import category references" rows={query.data.categories} rowKey={(category) => category.id} emptyMessage="No active categories are available." columns={[
        { key: 'id', label: 'categoryId', sortValue: (category) => category.id, render: (category) => category.id }, { key: 'name', label: 'Category', sortValue: (category) => category.name, render: (category) => category.name },
      ]} />
    </>}
  </DetailSection>;
}
