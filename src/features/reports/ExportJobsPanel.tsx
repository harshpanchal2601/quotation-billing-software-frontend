import { downloadBlob } from '@shared/api/download';
import { Alert, Stack, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@features/auth';
import { toApiError } from '@shared/api/apiClient';
import { ErrorState } from '@shared/components/common/ErrorState';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { AppButton } from '@shared/ui/actions';
import { formatRecordStatus } from '@shared/ui/display';
import { ConfirmDialog } from '@shared/ui/dialogs';
import { useNotification } from '@shared/ui/feedback';
import { RecordPagination, RecordTable, useTableSort } from '@shared/ui/tables';
import { downloadExport, loadExportJobs, queueExport, removeExport } from './reports.api';
import type { ExportFormat, ExportJob, ReportFilters } from './reports.types';

export function ExportJobsPanel({ filters, format }: { filters: ReportFilters; format: ExportFormat }) {
  const notify = useNotification();
  const [removing, setRemoving] = useState<ExportJob | null>(null);
  const firmId = useFirmId(); const { user } = useAuth(); const cache = useQueryClient();
  const key = ['report-export-jobs', firmId, user?.id];
  const [page, setPage] = useState(1); const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  const sorting = useTableSort([{ key: 'createdAt', label: 'Created date' }, { key: 'format', label: 'Format' }, { key: 'fileSize', label: 'File size' }, { key: 'completedAt', label: 'Completed date' }], { onChange: () => setPage(1) });
  const downloadController = useRef<AbortController>();
  const queueLock = useRef(false); const fileLock = useRef(false); const dismissFailure = useRef<(() => void) | null>(null);
  useEffect(() => () => downloadController.current?.abort(), []);
  useEffect(() => { setRequestKey(crypto.randomUUID()); }, [filters, format]);
  const jobs = useQuery({ queryKey: [...key, page, sorting.sortBy, sorting.sortOrder], queryFn: ({ signal }) => loadExportJobs(page, signal, { sortBy: sorting.sortBy, sortOrder: sorting.sortOrder }), enabled: firmId != null, retry: false,
    refetchInterval: (query) => query.state.data?.workerEnabled && query.state.data.jobs.some((job) => ['PENDING', 'PROCESSING'].includes(job.event.status)) ? 5000 : false,
  });
  const refresh = async () => { try { await cache.invalidateQueries({ queryKey: key }, { throwOnError: true }); } catch { notify('The change was saved, but export jobs could not refresh. Refresh the list.', 'warning'); } };
  const clearFailure = () => { dismissFailure.current?.(); dismissFailure.current = null; };
  const failed = (error: unknown) => { const failure = toApiError(error); if (!failure.cancelled) { clearFailure(); dismissFailure.current = notify(failure.message, 'error'); } };
  const create = useMutation({ mutationFn: () => queueExport(filters, format, requestKey), onSuccess: async () => { clearFailure(); setRequestKey(crypto.randomUUID()); setPage(1); notify('Export queued. Its progress appears in the records.'); await refresh(); }, onError: failed, onSettled: () => { queueLock.current = false; } });
  const remove = useMutation({ mutationFn: removeExport, onSuccess: async () => { clearFailure(); setRemoving(null); notify('Export job removed.'); await refresh(); }, onError: failed, onSettled: () => { fileLock.current = false; } });
  const download = useMutation({ mutationFn: async (job: ExportJob) => {
    const controller = new AbortController(); downloadController.current = controller;
    const blob = await downloadExport(job.id, controller.signal);
    if (controller.signal.aborted) return;
    downloadBlob(blob, `report-${job.id}.${job.format}`);
    clearFailure();
    notify('Export download started.');
  }, onError: failed, onSettled: () => { fileLock.current = false; } });
  return <Stack spacing={2}><Typography component="h2" variant="h2">Your queued exports</Typography><Typography>Queued reports capture their source data when the worker runs. Downloads recheck your current source permissions. Stored files consume the firm storage quota and remain private to your account until removed.</Typography>
    {jobs.data && !jobs.data.workerEnabled ? <Alert severity="info">Queued export processing is disabled on this server. Direct exports remain available.</Alert> : null}
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}><AppButton disabled={!jobs.data?.workerEnabled || create.isPending} onClick={() => { if (queueLock.current || !jobs.data?.workerEnabled) return; queueLock.current = true; create.mutate(); }}>Queue {format.toUpperCase()} export</AppButton><AppButton variant="outlined" disabled={jobs.isFetching} onClick={() => void jobs.refetch()}>Refresh export jobs</AppButton></Stack>
    {jobs.isError ? <ErrorState message={toApiError(jobs.error).message} onRetry={() => void jobs.refetch()} /> : null}
    {[create.error, remove.error, download.error].filter(Boolean).map((error, index) => <ErrorState key={index} message={toApiError(error).message} />)}
    {jobs.isPending ? <Typography role="status">Loading export jobs…</Typography> : null}
    {jobs.data ? <><RecordTable rows={jobs.data.jobs} sorting={sorting} rowNumberStart={(page - 1) * 20 + 1} label="Queued export jobs" rowKey={(job) => job.id} emptyMessage="No exports queued. Choose a format and queue an export to track it here." columns={[
      { key: 'id', label: 'Export', render: (job) => <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>{job.id}</Typography> },
      { key: 'format', sortKey: 'format', label: 'Format', render: (job) => job.format.toUpperCase() }, { key: 'period', label: 'Period', render: (job) => `${job.filters.dateFrom} to ${job.filters.dateTo}` },
      { key: 'status', label: 'Status', render: (job) => formatRecordStatus(job.event.status) }, { key: 'attempts', label: 'Attempts', align: 'right', render: (job) => `${job.event.attempts}/${job.event.maxAttempts}` },
      { key: 'size', sortKey: 'fileSize', label: 'File size', align: 'right', render: (job) => job.fileSize === null ? '—' : `${job.fileSize} bytes` },
      { key: 'actions', label: 'Actions', render: (job) => <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>{job.event.status === 'SUCCEEDED' && job.completedAt ? <AppButton disabled={download.isPending || remove.isPending} onClick={() => { if (fileLock.current) return; fileLock.current = true; download.mutate(job); }}>Download {job.format.toUpperCase()}</AppButton> : null}<AppButton variant="outlined" color="error" disabled={remove.isPending || download.isPending} onClick={() => { if (!fileLock.current) setRemoving(job); }}>Remove export job</AppButton></Stack> },
    ]} /><RecordPagination pagination={jobs.data.pagination} page={page} change={setPage} /></> : null}
    <ConfirmDialog open={removing !== null} title="Remove export job?" confirmLabel="Remove export job" confirmColor="error" isConfirming={remove.isPending} onClose={() => { if (!fileLock.current) setRemoving(null); }} onConfirm={() => { if (removing && !fileLock.current) { fileLock.current = true; remove.mutate(removing.id); } }}>The private {removing?.format.toUpperCase()} export for {removing?.filters.dateFrom} to {removing?.filters.dateTo} will be removed, including any stored download. Source records are retained.</ConfirmDialog>
  </Stack>;
}
