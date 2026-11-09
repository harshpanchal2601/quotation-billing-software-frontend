import { Alert, Checkbox, FormControlLabel, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { PERMISSIONS, useAuth, useHasPermission } from '@features/auth';
import { toApiError } from '@shared/api/apiClient';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { AppButton } from '@shared/ui/actions';
import { PageContainer, PageHeader } from '@shared/ui/layout';
import { ReportSections } from './ReportSections';
import { deleteReportView, downloadReport, loadReport, loadSavedReports, reportsKeys, saveReportView } from './reports.api';
import { REPORT_SECTION_LABELS, type ReportFilters, type ReportSectionKey, type SavedReportView } from './reports.types';

function initialFilters(): ReportFilters {
  const now = new Date();
  return { dateFrom: new Date(now.getTime() - 29 * 86_400_000).toISOString().slice(0, 10), dateTo: now.toISOString().slice(0, 10), sections: Object.keys(REPORT_SECTION_LABELS) as ReportSectionKey[] };
}

export function ReportsPage() {
  const firmId = useFirmId(); const { user } = useAuth();
  return <ReportsWorkspace key={`${firmId}:${user?.id}`} />;
}

function ReportsWorkspace() {
  const firmId = useFirmId(); const { user } = useAuth(); const cache = useQueryClient();
  const canExport = useHasPermission(PERMISSIONS.REPORTS_EXPORT);
  const scope = reportsKeys.firm(firmId, user?.id);
  const [filters, setFilters] = useState(initialFilters);
  const [draft, setDraft] = useState(filters);
  const [formError, setFormError] = useState('');
  const [name, setName] = useState(''); const [view, setView] = useState<SavedReportView | undefined>();
  const [page, setPage] = useState(1); const [downloadError, setDownloadError] = useState(''); const [downloading, setDownloading] = useState(false);
  const download = useRef<AbortController | null>(null);
  useEffect(() => () => download.current?.abort(), []);
  const overview = useQuery({ queryKey: [...scope, 'overview', filters], queryFn: ({ signal }) => loadReport(filters, signal), enabled: firmId != null, staleTime: 30_000, retry: false });
  const saved = useQuery({ queryKey: [...scope, 'saved', page], queryFn: ({ signal }) => loadSavedReports(page, signal), enabled: firmId != null, retry: false });
  const save = useMutation({ mutationFn: (existing?: SavedReportView) => saveReportView(name.trim(), filters, existing), onSuccess: async (result) => { setView(result); setName(result.name); setPage(1); await cache.invalidateQueries({ queryKey: [...scope, 'saved'] }); } });
  const remove = useMutation({ mutationFn: deleteReportView, onSuccess: async () => { setView(undefined); setName(''); setPage(1); await cache.invalidateQueries({ queryKey: [...scope, 'saved'] }); } });
  const changePage = (next: number) => { setView(undefined); setName(''); setPage(next); };
  const busy = save.isPending || remove.isPending;
  const apply = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.dateFrom || !draft.dateTo || draft.dateFrom > draft.dateTo || draft.sections.length === 0) { setFormError('Choose a valid date range and at least one report.'); return; }
    if (draft.currency && !/^[A-Za-z]{3}$/.test(draft.currency)) { setFormError('Currency must contain three letters.'); return; }
    setFormError(''); setFilters({ ...draft, currency: draft.currency?.trim().toUpperCase() || undefined });
  };
  const exportCsv = async () => {
    const controller = new AbortController(); download.current = controller; setDownloading(true); setDownloadError('');
    try {
      const blob = await downloadReport(filters, controller.signal);
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(blob); const link = document.createElement('a');
      link.href = url; link.download = `reports-${filters.dateFrom}-${filters.dateTo}.csv`; document.body.appendChild(link);
      try { link.click(); } finally { link.remove(); URL.revokeObjectURL(url); }
    } catch (error) { if (!controller.signal.aborted) setDownloadError(toApiError(error).message); }
    finally { if (!controller.signal.aborted) setDownloading(false); }
  };
  return <PageContainer>
    <PageHeader title="Business reports" description="Source records with explicit date rules and separate currencies" actions={canExport ? <AppButton onClick={() => void exportCsv()} disabled={downloading || overview.isFetching || !overview.data}>{downloading ? 'Exporting…' : 'Export CSV'}</AppButton> : undefined} />
    <Typography color="text.secondary">Period activity uses UTC calendar boundaries. Receivables show current balances. Stock shows closing valuation. Values retain source precision and currencies are never combined.</Typography>
    <Stack component="form" onSubmit={apply} spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField type="date" label="From date" value={draft.dateFrom} onChange={(event) => setDraft({ ...draft, dateFrom: event.target.value })} InputLabelProps={{ shrink: true }} required />
        <TextField type="date" label="Through date" value={draft.dateTo} onChange={(event) => setDraft({ ...draft, dateTo: event.target.value })} InputLabelProps={{ shrink: true }} required />
        <TextField label="Currency (optional)" value={draft.currency ?? ''} onChange={(event) => setDraft({ ...draft, currency: event.target.value })} inputProps={{ maxLength: 3 }} helperText="Leave empty to report every currency separately." />
      </Stack>
      <Stack direction="row" useFlexGap flexWrap="wrap">
        {(Object.keys(REPORT_SECTION_LABELS) as ReportSectionKey[]).map((key) => (
          <FormControlLabel
            key={key}
            label={REPORT_SECTION_LABELS[key]}
            control={
              <Checkbox
                checked={draft.sections.includes(key)}
                onChange={(_, checked) => setDraft({
                  ...draft,
                  sections: checked
                    ? [...draft.sections, key]
                    : draft.sections.filter((value) => value !== key),
                })}
              />
            }
          />
        ))}
      </Stack>
      <Stack direction="row" spacing={1}><AppButton type="submit" disabled={overview.isFetching}>Apply filters</AppButton><AppButton variant="outlined" onClick={() => void overview.refetch()} disabled={overview.isFetching}>Refresh</AppButton></Stack>
    </Stack>
    {formError ? <Alert severity="error">{formError}</Alert> : null}
    {[overview.error, saved.error, save.error, remove.error].filter(Boolean).map((error, index) => <Alert severity="error" key={index}>{toApiError(error).message}</Alert>)}
    {downloadError ? <Alert severity="error">{downloadError}</Alert> : null}
    <Stack spacing={2}>
      <Typography component="h2" variant="h2">Your saved views</Typography>
      <TextField select label="Saved report view" value={saved.data?.views.some((row) => row.id === view?.id) ? view!.id : ''} disabled={busy} onChange={(event) => {
        const selected = saved.data?.views.find((row) => row.id === event.target.value);
        setView(selected); setName(selected?.name ?? '');
        if (selected) { setFilters(selected.filters); setDraft(selected.filters); setFormError(''); }
      }}>
        <MenuItem value="">New view</MenuItem>{saved.data?.views.map((row) => <MenuItem key={row.id} value={row.id}>{row.name}</MenuItem>)}
      </TextField>
      {saved.data && saved.data.pagination.totalPages > 1 ? <Stack direction="row" spacing={1}><AppButton disabled={page === 1 || busy} onClick={() => changePage(page - 1)}>Previous views</AppButton><Typography>Page {page} of {saved.data.pagination.totalPages}</Typography><AppButton disabled={page >= saved.data.pagination.totalPages || busy} onClick={() => changePage(page + 1)}>Next views</AppButton></Stack> : null}
      <TextField label="View name" value={name} disabled={busy} onChange={(event) => setName(event.target.value)} inputProps={{ maxLength: 100 }} helperText="Saves the applied dates, currency and reports privately to your account." />
      <Stack direction="row" spacing={1}><AppButton disabled={busy || !name.trim()} onClick={() => save.mutate(undefined)}>Save as new</AppButton>{view ? <><AppButton variant="outlined" disabled={busy || !name.trim()} onClick={() => save.mutate(view)}>Update view</AppButton><AppButton variant="outlined" color="error" disabled={busy} onClick={() => remove.mutate(view)}>Delete view</AppButton></> : null}</Stack>
      {save.isSuccess ? <Alert severity="success">Report view saved.</Alert> : null}
    </Stack>
    {overview.isFetching ? <Typography role="status">Loading source reports…</Typography> : overview.isSuccess ? <><Typography variant="caption">Firm #{overview.data.firmId} · Applied period {overview.data.dateFrom} to {overview.data.dateTo} · Generated {overview.data.generatedAt}</Typography><ReportSections sections={overview.data.sections} /></> : null}
    {overview.isError ? <AppButton onClick={() => void overview.refetch()}>Retry reports</AppButton> : null}
  </PageContainer>;
}
