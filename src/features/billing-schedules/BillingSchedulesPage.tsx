import { Alert, Link as MuiLink, MenuItem, Stack, TextField, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useAuth } from '@features/auth';
import { Link, useSearchParams } from 'react-router-dom';
import { toApiError } from '@shared/api/apiClient';
import { ErrorState } from '@shared/components/common/ErrorState';
import { billingDateToday } from '@shared/dates/billingDate';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { formatRecordStatus } from '@shared/ui/display';
import { AppButton } from '@shared/ui/actions';
import { CommandForm } from '@shared/forms/CommandForm';
import { AppDialog, ConfirmDialog } from '@shared/ui/dialogs';
import { useNotification } from '@shared/ui/feedback';
import { RecordPagination, RecordTable, useTableSort } from '@shared/ui/tables';
import { AmountSummary, DetailActions, DetailFields, DetailSection, PageContainer, PageHeader } from '@shared/ui/layout';
import { approveSchedule, createSchedule, getSchedule, listSchedules, previewSchedule, retryScheduleRun, reviseSchedule, stopSchedule, type Schedule, type ScheduleCreate } from './billing-schedules.api';

export function BillingSchedulesPage() { const firmId = useFirmId(); const { user } = useAuth(); return <Schedules key={`${firmId}:${user?.id}`} />; }
function Schedules() {
  const compact = useMediaQuery(useTheme().breakpoints.down('sm'));
  const firmId = useFirmId(); const client = useQueryClient(); const [params] = useSearchParams();
  const [page, setPage] = useState(1); const [selectedId, setSelectedId] = useState<number | null>(null); const [createOpen, setCreateOpen] = useState(false);
  const sorting = useTableSort([{ key: 'id', label: 'Record number' }, { key: 'name', label: 'Schedule name' }, { key: 'status', label: 'Status' }, { key: 'version', label: 'Version' }, { key: 'nextPeriod', label: 'Next billing period' }], { onChange: () => setPage(1) });
  const query = useQuery({ queryKey: ['billing-schedules', firmId, 'list', page, sorting.sortBy, sorting.sortOrder], queryFn: ({ signal }) => listSchedules(page, signal, { sortBy: sorting.sortBy, sortOrder: sorting.sortOrder }), enabled: firmId != null, refetchInterval: 15000 });
  return <PageContainer><PageHeader title="Recurring invoice drafts" description="Approved schedules produce drafts for human review and issuance" actions={<AppButton variant="contained" onClick={() => setCreateOpen(true)}>Create schedule</AppButton>} />
    <Alert severity="info">Schedules follow the existing Asia/Kolkata billing calendar. Monthly dates retain their original day and use the last valid day in shorter months. To change cadence or the start date, cancel the schedule and create a new one.</Alert>
    {query.isError ? <ErrorState message={toApiError(query.error).message} onRetry={() => void query.refetch()} /> : null}
    {query.isPending ? <Typography>Loading schedules…</Typography> : null}
    {query.data ? <><RecordTable rows={query.data.schedules} sorting={sorting} rowNumberStart={(page - 1) * 20 + 1} label="Recurring schedules" rowKey={(schedule) => schedule.id} emptyMessage="No schedules yet. Create a manual invoice draft, then use it as a recurring template." columns={[
      { key: 'name', sortKey: 'name', label: 'Schedule', render: (schedule) => <AppButton onClick={() => setSelectedId(schedule.id)}>{schedule.name}</AppButton> }, { key: 'status', sortKey: 'status', label: 'Status', render: (schedule) => formatRecordStatus(schedule.status) },
      { key: 'version', sortKey: 'version', label: 'Version', align: 'right', render: (schedule) => schedule.version }, { key: 'nextPeriod', sortKey: 'nextPeriod', label: 'Next billing period', render: (schedule) => schedule.nextPeriod },
    ]} /><RecordPagination pagination={query.data.pagination} page={page} change={setPage} /></> : null}
    <AppDialog open={selectedId !== null} title="Recurring schedule" onClose={() => setSelectedId(null)} showCloseButton fullWidth maxWidth="md" fullScreen={compact}>{selectedId ? <ScheduleDetails key={selectedId} id={selectedId} onSaved={() => setSelectedId(null)} /> : null}</AppDialog>
    {createOpen ? <ScheduleForm initialDraftId={Number(params.get('sourceDraftId')) || 0} onClose={() => setCreateOpen(false)} onSaved={() => { setSelectedId(null); setCreateOpen(false); void client.invalidateQueries({ queryKey: ['billing-schedules', firmId] }); }} /> : null}
  </PageContainer>;
}
function ScheduleDetails({ id, onSaved }: { id: number; onSaved: () => void }) {
  const firmId = useFirmId(); const client = useQueryClient(); const notify = useNotification(); const [revisionOpen, setRevisionOpen] = useState(false); const [cancelOpen, setCancelOpen] = useState(false);
  const query = useQuery({ queryKey: ['billing-schedules', firmId, 'detail', id], queryFn: ({ signal }) => getSchedule(id, signal), enabled: firmId != null, refetchInterval: 10000 });
  const actionLock = useRef(false); const previewLock = useRef(false);
  const review = useMutation({ mutationFn: () => previewSchedule(id), onSettled: () => { previewLock.current = false; } });
  const mutation = useMutation({ mutationFn: (action: () => Promise<unknown>) => action(), onSuccess: async () => {
    review.reset(); setCancelOpen(false); notify('Recurring schedule updated.'); onSaved();
    try { await Promise.all([client.invalidateQueries({ queryKey: ['billing-schedules', firmId] }, { throwOnError: true }), client.invalidateQueries({ queryKey: ['billing', firmId] }, { throwOnError: true })]); }
    catch { notify('The schedule was updated, but related records could not refresh. Reload before submitting another change.', 'warning'); }
  }, onError: (error) => {
    const failure = toApiError(error); notify(failure.message, 'error');
    if (failure.isConflict) { review.reset(); void query.refetch(); }
  }, onSettled: () => { actionLock.current = false; } });
  const busy = mutation.isPending || review.isPending;
  function execute(action: () => Promise<unknown>) { if (actionLock.current || previewLock.current) return; actionLock.current = true; mutation.mutate(action); }
  function preview() { if (actionLock.current || previewLock.current) return; previewLock.current = true; review.mutate(); }
  if (query.isError) return <ErrorState message={toApiError(query.error).message} onRetry={() => void query.refetch()} />;
  if (!query.data) return <Typography>Loading schedule history…</Typography>;
  const schedule = query.data; const config = schedule.versions.find((entry) => entry.version === schedule.version)!.config;
  return <Stack spacing={2}><DetailSection title={schedule.name}><DetailFields fields={[
    { label: 'Status', value: formatRecordStatus(schedule.status) }, { label: 'Version', value: schedule.version },
    { label: 'Next billing period', value: schedule.nextPeriod }, { label: 'Frequency', value: config.intervalMonths === 1 ? 'Monthly' : config.intervalMonths === 3 ? 'Quarterly' : 'Yearly' },
    { label: 'Payment due after', value: `${config.dueDays} day${config.dueDays === 1 ? '' : 's'}` }, { label: 'End date', value: config.endDate || 'Not set' },
  ]} /></DetailSection>
    {mutation.isError ? <Alert severity="error">{toApiError(mutation.error).message}</Alert> : null}{review.isError ? <Alert severity="error">{toApiError(review.error).message}</Alert> : null}
    <DetailActions label="Schedule actions">
      {schedule.status === 'PAUSED' ? <><AppButton isLoading={review.isPending} disabled={busy} onClick={preview}>Review approval preview</AppButton><AppButton disabled={busy} onClick={() => setRevisionOpen(true)}>Revise template</AppButton></> : null}
      {schedule.status === 'ACTIVE' ? <AppButton isLoading={mutation.isPending} disabled={busy} onClick={() => execute(() => stopSchedule(id, 'pause', schedule.version))}>Pause schedule</AppButton> : null}
      {['ACTIVE', 'PAUSED'].includes(schedule.status) ? <AppButton color="error" disabled={busy} onClick={() => setCancelOpen(true)}>Cancel schedule</AppButton> : null}
    </DetailActions>
    {schedule.status === 'PAUSED' && review.data ? <DetailSection title="Financial approval preview"><RecordTable rows={review.data.preview.lines} label="Schedule approval preview" rowKey={(line) => line.lineNumber} columns={[
      { key: 'item', label: 'Item', sortValue: (line) => line.itemName, render: (line) => line.itemName }, { key: 'quantity', label: 'Quantity', align: 'right', sortValue: (line) => line.quantity, render: (line) => line.quantity }, { key: 'rate', label: 'Rate', align: 'right', sortValue: (line) => line.unitRate, render: (line) => line.unitRate }, { key: 'total', label: 'Total', align: 'right', sortValue: (line) => line.lineTotal, render: (line) => line.lineTotal },
    ]} /><AmountSummary rows={[
      { label: 'Taxable amount', value: `${review.data.preview.currency} ${review.data.preview.taxableAmount}` },
      { label: 'Tax', value: `${review.data.preview.currency} ${review.data.preview.taxAmount}` },
      { label: 'Total', value: `${review.data.preview.currency} ${review.data.preview.grandTotal}`, emphasis: true },
    ]} /><AppButton variant="contained" isLoading={mutation.isPending} disabled={busy} onClick={() => execute(() => approveSchedule(id, schedule.version, review.data!.previewToken))}>Approve this schedule version</AppButton></DetailSection> : null}
    <DetailSection title="Versions and approvals" description="Latest 100 saved versions."><RecordTable rows={schedule.versions} label="Schedule versions and approvals" rowKey={(version) => version.version} columns={[
      { key: 'version', label: 'Version', align: 'right', sortValue: (version) => version.version, render: (version) => version.version }, { key: 'draft', label: 'Source draft', sortValue: (version) => version.config.sourceDraftId, render: (version) => `#${version.config.sourceDraftId}` },
      { key: 'creator', label: 'Creator', sortValue: (version) => version.createdById, render: (version) => `#${version.createdById}` }, { key: 'approvedAt', label: 'Approved at', sortValue: (version) => version.approvedAt, render: (version) => version.approvedAt ? new Date(version.approvedAt).toLocaleString() : 'Awaiting approval' }, { key: 'approver', label: 'Approved by', render: (version) => version.approvedById ? `#${version.approvedById}` : '—' },
    ]} />
    </DetailSection><DetailSection title="Billing periods" description="Latest 100 billing periods."><RecordTable rows={schedule.runs} label="Billing periods" rowKey={(run) => run.id} columns={[
      { key: 'period', label: 'Period', sortValue: (run) => run.period, render: (run) => run.period }, { key: 'version', label: 'Version', align: 'right', sortValue: (run) => run.version, render: (run) => run.version },
      { key: 'outcome', label: 'Outcome', sortValue: (run) => run.status, render: (run) => `${formatRecordStatus(run.status)} · ${run.event ? formatRecordStatus(run.event.status) : 'No job'}` }, { key: 'attempts', label: 'Attempts', render: (run) => run.event?.jobAttempts.map((attempt) => `${attempt.attempt}: ${attempt.outcome ? formatRecordStatus(attempt.outcome) : 'Processing'} ${attempt.errorCode || ''}`).join('; ') || 'No attempts' },
      { key: 'actions', label: 'Draft / retry', render: (run) => run.invoiceId ? <MuiLink component={Link} to={`/invoices/${run.invoiceId}`}>Review draft #{run.invoiceId}</MuiLink> : run.event?.status === 'DEAD' && schedule.status === 'ACTIVE' && run.version === schedule.version ? <AppButton isLoading={mutation.isPending} disabled={busy} onClick={() => execute(() => retryScheduleRun(id, run.id, run.retryCount))}>Retry period</AppButton> : '—' },
    ]} />
    </DetailSection><ConfirmDialog open={cancelOpen} title="Cancel this schedule?" cancelLabel="Keep schedule" confirmLabel="Confirm cancellation" confirmColor="error" isConfirming={mutation.isPending} onClose={() => setCancelOpen(false)} onConfirm={() => execute(() => stopSchedule(id, 'cancel', schedule.version))}>Future draft generation stops. Existing drafts, issued invoices, versions and job history remain available.</ConfirmDialog>
    {revisionOpen ? <ScheduleForm schedule={schedule} onClose={() => setRevisionOpen(false)} onSaved={() => { setRevisionOpen(false); review.reset(); onSaved(); void client.invalidateQueries({ queryKey: ['billing-schedules', firmId] }); }} /> : null}
  </Stack>;
}
function ScheduleForm({ schedule, initialDraftId = 0, onClose, onSaved }: { schedule?: Schedule; initialDraftId?: number; onClose: () => void; onSaved: (schedule: Schedule) => void }) {
  const current = schedule?.versions.find((entry) => entry.version === schedule.version)?.config;
  const recorded = useRef<Schedule>();
  const [input, setInput] = useState<Omit<ScheduleCreate, 'idempotencyKey'>>(() => ({ name: schedule?.name || '', sourceDraftId: current?.sourceDraftId ?? initialDraftId, startDate: current?.startDate ?? billingDateToday(), endDate: current?.endDate ?? null, intervalMonths: current?.intervalMonths ?? 1, dueDays: current?.dueDays ?? 30 }));
  return <CommandForm dialog maxWidth="md" initialOpen hideTrigger title={schedule ? 'Create schedule revision' : 'Create paused billing schedule'} label="Save paused version" onClosed={onClose} successMessage="Paused schedule version saved. Review and approve it before draft generation." submit={async (_data, key) => { recorded.current = schedule ? await reviseSchedule(schedule.id, { expectedVersion: schedule.version, sourceDraftId: input.sourceDraftId, dueDays: input.dueDays, endDate: input.endDate }) : await createSchedule({ ...input, idempotencyKey: key }); }} saved={() => onSaved(recorded.current!)}>
    <input type="hidden" name="schedulePayload" value={JSON.stringify(input)} />
    {!schedule ? <TextField label="Schedule name" required value={input.name} inputProps={{ maxLength: 191 }} onChange={(event) => setInput({ ...input, name: event.target.value })} /> : null}
    <TextField label="Invoice draft number" required type="number" value={input.sourceDraftId || ''} inputProps={{ min: 1, step: 1 }} onChange={(event) => setInput({ ...input, sourceDraftId: Number(event.target.value) })} helperText="Use the number shown as Draft # on a manual invoice. Its values are copied into this schedule version." />
    <TextField label="First billing date" type="date" required disabled={Boolean(schedule)} value={input.startDate} InputLabelProps={{ shrink: true }} inputProps={{ min: billingDateToday() }} onChange={(event) => setInput({ ...input, startDate: event.target.value })} />
    <TextField label="Billing cadence" select disabled={Boolean(schedule)} value={input.intervalMonths} onChange={(event) => setInput({ ...input, intervalMonths: Number(event.target.value) as 1 | 3 | 12 })}>{[[1, 'Monthly'], [3, 'Quarterly'], [12, 'Yearly']].map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</TextField>
    <TextField label="Days until payment due" type="number" required value={input.dueDays} inputProps={{ min: 0, max: 3650, step: 1 }} onChange={(event) => setInput({ ...input, dueDays: Number(event.target.value) })} />
    <TextField label="Last billing date (optional)" type="date" value={input.endDate ?? ''} InputLabelProps={{ shrink: true }} inputProps={{ min: schedule?.nextPeriod ?? input.startDate }} onChange={(event) => setInput({ ...input, endDate: event.target.value || null })} />
  </CommandForm>;
}
