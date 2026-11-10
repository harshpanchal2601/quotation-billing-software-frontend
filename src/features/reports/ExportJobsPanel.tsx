import { Alert, Stack, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@features/auth';
import { apiClient, toApiError, type ApiSuccessResponse } from '@shared/api/apiClient';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { AppButton } from '@shared/ui/actions';
import type { ReportFilters } from './reports.types';

type Job = { id: string; format: 'csv' | 'xlsx' | 'pdf'; filters: ReportFilters; fileSize: number | null; fileHash: string | null; completedAt: string | null; event: { status: string; attempts: number; maxAttempts: number } };
type Jobs = { jobs: Job[]; workerEnabled: boolean; pagination: { totalPages: number } };
export function ExportJobsPanel({ filters, format }: { filters: ReportFilters; format: Job['format'] }) {
  const firmId = useFirmId(); const { user } = useAuth(); const cache = useQueryClient();
  const key = ['report-export-jobs', firmId, user?.id];
  const [page, setPage] = useState(1); const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  const downloadController = useRef<AbortController>();
  useEffect(() => () => downloadController.current?.abort(), []);
  useEffect(() => { setRequestKey(crypto.randomUUID()); }, [filters, format]);
  const jobs = useQuery({ queryKey: [...key, page], queryFn: async ({ signal }) => (await apiClient.get<ApiSuccessResponse<Jobs>>('/exports', { params: { page, limit: 20 }, signal })).data.data, enabled: firmId != null, retry: false,
    refetchInterval: (query) => query.state.data?.workerEnabled && query.state.data.jobs.some((job) => ['PENDING', 'PROCESSING'].includes(job.event.status)) ? 5000 : false,
  });
  const create = useMutation({ mutationFn: async () => { await apiClient.post('/exports', { filters, format, requestKey }); }, onSuccess: async () => { setRequestKey(crypto.randomUUID()); setPage(1); await cache.invalidateQueries({ queryKey: key }); } });
  const remove = useMutation({ mutationFn: async (id: string) => { await apiClient.delete(`/exports/${id}`); }, onSuccess: () => cache.invalidateQueries({ queryKey: key }) });
  const download = useMutation({ mutationFn: async (job: Job) => {
    const controller = new AbortController(); downloadController.current = controller;
    const result = await apiClient.get<Blob>(`/exports/${job.id}/download`, { responseType: 'blob', signal: controller.signal, timeout: 60_000 });
    if (controller.signal.aborted) return;
    const url = URL.createObjectURL(result.data); const link = document.createElement('a'); link.href = url; link.download = `report-${job.id}.${job.format}`; document.body.appendChild(link);
    try { link.click(); } finally { link.remove(); URL.revokeObjectURL(url); }
  } });
  return <Stack spacing={2}><Typography component="h2" variant="h2">Your queued exports</Typography><Typography>Queued reports capture their source data when the worker runs. Downloads recheck your current source permissions. Stored files consume the firm storage quota and remain private to your account until removed.</Typography>
    {jobs.data && !jobs.data.workerEnabled ? <Alert severity="info">Queued export processing is disabled on this server. Direct exports remain available.</Alert> : null}
    <Stack direction="row" spacing={1}><AppButton disabled={!jobs.data?.workerEnabled || create.isPending} onClick={() => create.mutate()}>Queue {format.toUpperCase()} export</AppButton><AppButton variant="outlined" disabled={jobs.isFetching} onClick={() => void jobs.refetch()}>Refresh export jobs</AppButton></Stack>
    {[jobs.error, create.error, remove.error, download.error].filter(Boolean).map((error, index) => <Alert severity="error" key={index}>{toApiError(error).message}</Alert>)}
    {create.isSuccess ? <Alert severity="success">Export queued. Its progress appears below.</Alert> : null}
    {jobs.data?.jobs.length === 0 ? <Typography>No export jobs recorded.</Typography> : null}
    {jobs.data?.jobs.map((job) => <Stack key={job.id} spacing={1}><Typography>#{job.id} · {job.format.toUpperCase()} · {job.filters.dateFrom} to {job.filters.dateTo} · {job.event.status} · Attempts {job.event.attempts}/{job.event.maxAttempts}</Typography>{job.fileHash ? <Typography variant="caption" sx={{ overflowWrap: 'anywhere' }}>SHA-256 {job.fileHash} · {job.fileSize} bytes</Typography> : null}<Stack direction="row" spacing={1}>{job.event.status === 'SUCCEEDED' && job.completedAt ? <AppButton disabled={download.isPending || remove.isPending} onClick={() => download.mutate(job)}>Download {job.format.toUpperCase()}</AppButton> : null}<AppButton variant="outlined" disabled={remove.isPending || download.isPending} onClick={() => remove.mutate(job.id)}>Remove export job</AppButton></Stack></Stack>)}
    {jobs.data && jobs.data.pagination.totalPages > 1 ? <Stack direction="row" spacing={1}><AppButton disabled={page === 1} onClick={() => setPage(page - 1)}>Previous export jobs</AppButton><AppButton disabled={page >= jobs.data.pagination.totalPages} onClick={() => setPage(page + 1)}>Next export jobs</AppButton></Stack> : null}
  </Stack>;
}
