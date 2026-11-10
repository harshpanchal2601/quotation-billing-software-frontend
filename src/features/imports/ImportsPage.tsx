import { Alert, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { PERMISSIONS, useAuth, useHasPermission } from '@features/auth';
import { toApiError } from '@shared/api/apiClient';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { AppButton } from '@shared/ui/actions';
import { PageContainer, PageHeader } from '@shared/ui/layout';
import { commitImport, compensateImport, importKeys, loadImport, loadImports, previewImport, type ImportDetail, type ImportTarget } from './imports.api';

export function ImportsPage() {
  const firmId = useFirmId(); const { user } = useAuth();
  return <ImportWorkspace key={`${firmId}:${user?.id}`} />;
}

function ImportWorkspace() {
  const firmId = useFirmId(); const { user } = useAuth(); const cache = useQueryClient();
  const canCustomers = useHasPermission(PERMISSIONS.COMPANIES_MANAGE);
  const canItems = useHasPermission(PERMISSIONS.ITEMS_MANAGE);
  const [target, setTarget] = useState<ImportTarget>(canCustomers ? 'CUSTOMERS' : 'ITEMS');
  const [csv, setCsv] = useState(''); const [selected, setSelected] = useState<number>(); const [page, setPage] = useState(1);
  const scope = importKeys(firmId, user?.id);
  const batches = useQuery({ queryKey: [...scope, 'list', page], queryFn: ({ signal }) => loadImports(page, signal), enabled: firmId != null, retry: false });
  const detail = useQuery({ queryKey: [...scope, 'detail', selected], queryFn: ({ signal }) => loadImport(selected!, signal), enabled: firmId != null && selected !== undefined, retry: false });
  const accept = async (result: ImportDetail) => { cache.setQueryData([...scope, 'detail', result.batch.id], result); setSelected(result.batch.id); await cache.invalidateQueries({ queryKey: [...scope, 'list'] }); };
  const preview = useMutation({ mutationFn: () => previewImport(target, csv), onSuccess: accept });
  const commit = useMutation({ mutationFn: () => commitImport(detail.data!.batch), onSuccess: accept, onSettled: () => cache.invalidateQueries({ queryKey: scope }) });
  const compensate = useMutation({ mutationFn: (rowId: number) => compensateImport(detail.data!.batch, rowId), onSuccess: accept, onSettled: () => cache.invalidateQueries({ queryKey: scope }) });
  const busy = preview.isPending || commit.isPending || compensate.isPending;
  const allowed = target === 'CUSTOMERS' ? canCustomers : canItems;
  const header = target === 'CUSTOMERS' ? 'externalId,name,legalName,gstin,pan,website,notes' : 'externalId,name,categoryId,measurementUnitId,defaultRate,gstRate,hsnCode,kind,shortDescription';
  return <PageContainer>
    <PageHeader title="Customer and item imports" description="Preview CSV rows before committing them to the selected firm" />
    <Typography>Paste UTF-8 CSV with a header and up to 500 data rows (512 KB). External identifiers are unique per firm and import target. Item category and unit IDs must belong to this firm. Imports create records; they do not update existing records.</Typography>
    {!canCustomers && !canItems ? <Alert severity="info">Customer or item management permission and the corresponding plan feature are required to import records.</Alert> : null}
    <Stack spacing={2} component="form" onSubmit={(event) => { event.preventDefault(); preview.mutate(); }}>
      <TextField select label="Import target" value={target} disabled={busy} onChange={(event) => { setTarget(event.target.value as ImportTarget); setCsv(''); }}><MenuItem value="CUSTOMERS" disabled={!canCustomers}>Customers</MenuItem><MenuItem value="ITEMS" disabled={!canItems}>Items</MenuItem></TextField>
      <Typography component="code" sx={{ overflowWrap: 'anywhere' }}>{header}</Typography>
      <TextField label="CSV content" multiline minRows={6} value={csv} disabled={busy} onChange={(event) => setCsv(event.target.value)} inputProps={{ maxLength: 512_000 }} helperText="Use the headers above. Optional columns can be omitted. Quote cells containing commas, line breaks or quotes." />
      <AppButton type="submit" disabled={busy || !csv || !allowed}>Preview import</AppButton>
    </Stack>
    {[batches.error, detail.error, preview.error, commit.error, compensate.error].filter(Boolean).map((error, index) => <Alert severity="error" key={index}>{toApiError(error).message}</Alert>)}
    {busy ? <Typography role="status">Processing import… Keep this page open. Reload the batch after a connection error before retrying.</Typography> : null}
    <Typography component="h2" variant="h2">Your import batches</Typography>
    <Stack direction="row" useFlexGap flexWrap="wrap" gap={1}>{batches.data?.batches.map((batch) => <AppButton key={batch.id} variant="outlined" disabled={busy} onClick={() => setSelected(batch.id)}>#{batch.id} {batch.target} · {batch.status}</AppButton>)}</Stack>
    {batches.data && batches.data.pagination.totalPages > 1 ? <Stack direction="row" spacing={1}><AppButton disabled={page === 1 || busy} onClick={() => setPage(page - 1)}>Previous</AppButton><Typography>Page {page}</Typography><AppButton disabled={page >= batches.data.pagination.totalPages || busy} onClick={() => setPage(page + 1)}>Next</AppButton></Stack> : null}
    {selected !== undefined ? <AppButton disabled={busy || detail.isFetching} onClick={() => void detail.refetch()}>Reload selected import</AppButton> : null}
    {detail.data ? <Stack spacing={2}>
      <Typography component="h2" variant="h2">Import #{detail.data.batch.id} · {detail.data.batch.status}</Typography>
      <Typography>Rows {detail.data.batch.totalRecords} · Imported {detail.data.batch.successfulRecords} · Rejected or failed {detail.data.batch.failedRecords}</Typography>
      <Alert severity="info">Commit processes approved rows independently. A failed row does not undo earlier successful rows. Compensation deactivates an unchanged imported record and preserves its business history; changed records require manual review.</Alert>
      <AppButton disabled={busy || detail.isFetching || !detail.data.rows.some((row) => row.status === 'APPROVED')} onClick={() => commit.mutate()}>Commit approved rows</AppButton>
      <TableContainer sx={{ maxHeight: 600 }}><Table size="small" aria-label="Import preview and provenance"><TableHead><TableRow><TableCell>External identifier</TableCell><TableCell>Name</TableCell><TableCell>Status</TableCell><TableCell>Result</TableCell><TableCell>Action</TableCell></TableRow></TableHead><TableBody>{detail.data.rows.map((row) => <TableRow key={row.id}><TableCell>{row.sourceIdentifier ?? 'Invalid identifier'}</TableCell><TableCell>{row.rawData.name}</TableCell><TableCell>{row.compensatedAt ? 'COMPENSATED' : row.status}</TableCell><TableCell>{row.errorMessage ?? (row.targetId ? `Created record #${row.targetId}` : '')}</TableCell><TableCell>{row.status === 'IMPORTED' && !row.compensatedAt ? <AppButton variant="outlined" disabled={busy || detail.isFetching} onClick={() => compensate.mutate(row.id)}>Deactivate imported record</AppButton> : null}</TableCell></TableRow>)}</TableBody></Table></TableContainer>
    </Stack> : null}
  </PageContainer>;
}
