import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toApiError } from '@shared/api/apiClient';
import { billingDateToday } from '@shared/dates/billingDate';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { AppButton } from '@shared/ui/actions';
import { PageContainer, PageHeader } from '@shared/ui/layout';
import { approveSchedule, createSchedule, getSchedule, listSchedules, previewSchedule, retryScheduleRun, reviseSchedule, stopSchedule, type Schedule, type ScheduleCreate } from './billing-schedules.api';

export function BillingSchedulesPage() { const firmId = useFirmId(); return <Schedules key={firmId} />; }
function Schedules() {
  const firmId = useFirmId(); const client = useQueryClient(); const [params] = useSearchParams();
  const [page, setPage] = useState(1); const [selectedId, setSelectedId] = useState<number | null>(null); const [createOpen, setCreateOpen] = useState(false);
  const query = useQuery({ queryKey: ['billing-schedules', firmId, 'list', page], queryFn: ({ signal }) => listSchedules(page, signal), enabled: firmId != null, refetchInterval: 15000 });
  return <PageContainer><PageHeader title="Recurring invoice drafts" description="Approved schedules produce drafts for human review and issuance" actions={<AppButton variant="contained" onClick={() => setCreateOpen(true)}>Create schedule</AppButton>} />
    <Alert severity="info">Schedules follow the existing Asia/Kolkata billing calendar. Monthly dates retain their original day and use the last valid day in shorter months. To change cadence or the start date, cancel the schedule and create a new one.</Alert>
    {query.isError ? <Alert severity="error">{toApiError(query.error).message}</Alert> : null}
    {query.isPending ? <Typography>Loading schedules…</Typography> : null}
    {query.data?.schedules.length === 0 ? <Typography>No schedules yet. Create a manual invoice draft, then use it as a recurring template.</Typography> : null}
    {query.data?.schedules.map((schedule) => <Stack key={schedule.id} direction="row" spacing={2} alignItems="center"><AppButton onClick={() => setSelectedId(schedule.id)}>{schedule.name}</AppButton><Typography>{schedule.status} · Version {schedule.version} · Next period {schedule.nextPeriod}</Typography></Stack>)}
    <Stack direction="row" spacing={2}><AppButton disabled={page === 1} onClick={() => setPage(page - 1)}>Previous schedules</AppButton><Typography>Page {page}</Typography><AppButton disabled={!query.data || page >= query.data.pagination.totalPages} onClick={() => setPage(page + 1)}>Next schedules</AppButton></Stack>
    {selectedId ? <ScheduleDetails key={selectedId} id={selectedId} /> : null}
    {createOpen ? <ScheduleForm initialDraftId={Number(params.get('sourceDraftId')) || 0} onClose={() => setCreateOpen(false)} onSaved={(schedule) => { setSelectedId(schedule.id); setCreateOpen(false); void client.invalidateQueries({ queryKey: ['billing-schedules', firmId] }); }} /> : null}
  </PageContainer>;
}
function ScheduleDetails({ id }: { id: number }) {
  const firmId = useFirmId(); const client = useQueryClient(); const [revisionOpen, setRevisionOpen] = useState(false); const [cancelOpen, setCancelOpen] = useState(false);
  const query = useQuery({ queryKey: ['billing-schedules', firmId, 'detail', id], queryFn: ({ signal }) => getSchedule(id, signal), enabled: firmId != null, refetchInterval: 10000 });
  const review = useMutation({ mutationFn: () => previewSchedule(id) });
  const mutation = useMutation({ mutationFn: (action: () => Promise<unknown>) => action(), onSuccess: () => { review.reset(); setCancelOpen(false); void client.invalidateQueries({ queryKey: ['billing-schedules', firmId] }); void client.invalidateQueries({ queryKey: ['billing', firmId] }); } });
  if (query.isError) return <Alert severity="error">{toApiError(query.error).message}</Alert>;
  if (!query.data) return <Typography>Loading schedule history…</Typography>;
  const schedule = query.data; const config = schedule.versions.find((entry) => entry.version === schedule.version)!.config;
  return <Stack spacing={2}><Typography variant="h5">{schedule.name} · {schedule.status}</Typography><Typography>Next period: {schedule.nextPeriod} · Every {config.intervalMonths} month(s) · Due after {config.dueDays} day(s) · End {config.endDate || 'Not set'}</Typography>
    {mutation.isError ? <Alert severity="error">{toApiError(mutation.error).message}</Alert> : null}{review.isError ? <Alert severity="error">{toApiError(review.error).message}</Alert> : null}
    <Stack direction="row" spacing={2}>
      {schedule.status === 'PAUSED' ? <><AppButton isLoading={review.isPending} onClick={() => review.mutate()}>Review approval preview</AppButton><AppButton onClick={() => setRevisionOpen(true)}>Revise template</AppButton></> : null}
      {schedule.status === 'ACTIVE' ? <AppButton isLoading={mutation.isPending} onClick={() => mutation.mutate(() => stopSchedule(id, 'pause', schedule.version))}>Pause schedule</AppButton> : null}
      {['ACTIVE', 'PAUSED'].includes(schedule.status) ? <AppButton color="error" onClick={() => setCancelOpen(true)}>Cancel schedule</AppButton> : null}
    </Stack>
    {schedule.status === 'PAUSED' && review.data ? <Stack spacing={2}><Typography variant="h6">Financial approval preview</Typography>{review.data.preview.lines.map((line) => <Typography key={line.lineNumber}>{line.itemName} · Quantity {line.quantity} · Rate {review.data!.preview.currency} {line.unitRate} · Total {line.lineTotal}</Typography>)}<Typography>Taxable {review.data.preview.currency} {review.data.preview.taxableAmount} · Tax {review.data.preview.taxAmount} · Total {review.data.preview.grandTotal}</Typography><AppButton variant="contained" isLoading={mutation.isPending} onClick={() => mutation.mutate(() => approveSchedule(id, schedule.version, review.data!.previewToken))}>Approve this schedule version</AppButton></Stack> : null}
    <Typography variant="h6">Latest 100 versions and approvals</Typography>{schedule.versions.map((version) => <Typography key={version.version}>Version {version.version} · Source draft #{version.config.sourceDraftId} · Creator #{version.createdById} · {version.approvedAt ? `Approved by #${version.approvedById} on ${new Date(version.approvedAt).toLocaleString()}` : 'Awaiting approval'}</Typography>)}
    <Typography variant="h6">Latest 100 billing periods</Typography><Stack sx={{ overflowX: 'auto' }}><Table aria-label="Billing periods"><TableHead><TableRow>{['Period', 'Version', 'Outcome', 'Draft / retry'].map((label) => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead><TableBody>{schedule.runs.map((run) => <TableRow key={run.id}><TableCell>{run.period}</TableCell><TableCell>{run.version}</TableCell><TableCell>{run.status} · {run.event?.status || 'No job'}{run.event?.jobAttempts.map((attempt) => <Typography key={attempt.attempt} variant="caption" display="block">Attempt {attempt.attempt}: {attempt.outcome || 'Processing'} {attempt.errorCode || ''}</Typography>)}</TableCell><TableCell>{run.invoiceId ? <Link to={`/invoices/${run.invoiceId}`}>Review draft #{run.invoiceId}</Link> : run.event?.status === 'DEAD' && schedule.status === 'ACTIVE' && run.version === schedule.version ? <AppButton isLoading={mutation.isPending} onClick={() => mutation.mutate(() => retryScheduleRun(id, run.id, run.retryCount))}>Retry period</AppButton> : null}</TableCell></TableRow>)}</TableBody></Table></Stack>
    <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)}><DialogTitle>Cancel this schedule?</DialogTitle><DialogContent><Typography>Future draft generation stops. Existing drafts, issued invoices, versions and job history remain available.</Typography></DialogContent><DialogActions><AppButton onClick={() => setCancelOpen(false)}>Keep schedule</AppButton><AppButton color="error" isLoading={mutation.isPending} onClick={() => mutation.mutate(() => stopSchedule(id, 'cancel', schedule.version))}>Confirm cancellation</AppButton></DialogActions></Dialog>
    {revisionOpen ? <ScheduleForm schedule={schedule} onClose={() => setRevisionOpen(false)} onSaved={() => { setRevisionOpen(false); review.reset(); void client.invalidateQueries({ queryKey: ['billing-schedules', firmId] }); }} /> : null}
  </Stack>;
}
function ScheduleForm({ schedule, initialDraftId = 0, onClose, onSaved }: { schedule?: Schedule; initialDraftId?: number; onClose: () => void; onSaved: (schedule: Schedule) => void }) {
  const current = schedule?.versions.find((entry) => entry.version === schedule.version)?.config;
  const [input, setInput] = useState<ScheduleCreate>(() => ({ name: schedule?.name || '', sourceDraftId: current?.sourceDraftId ?? initialDraftId, startDate: current?.startDate ?? billingDateToday(), endDate: current?.endDate ?? null, intervalMonths: current?.intervalMonths ?? 1, dueDays: current?.dueDays ?? 30, idempotencyKey: crypto.randomUUID() }));
  const save = useMutation({ mutationFn: () => schedule ? reviseSchedule(schedule.id, { expectedVersion: schedule.version, sourceDraftId: input.sourceDraftId, dueDays: input.dueDays, endDate: input.endDate }) : createSchedule(input), onSuccess: onSaved });
  function submit(event: FormEvent) { event.preventDefault(); save.mutate(); }
  return <Dialog open onClose={onClose} fullWidth maxWidth="sm"><Stack component="form" onSubmit={submit}><DialogTitle>{schedule ? 'Create schedule revision' : 'Create paused billing schedule'}</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
    {save.isError ? <Alert severity="error">{toApiError(save.error).message}</Alert> : null}
    {!schedule ? <TextField label="Schedule name" required value={input.name} inputProps={{ maxLength: 191 }} onChange={(event) => setInput({ ...input, name: event.target.value })} /> : null}
    <TextField label="Source invoice draft ID" required type="number" value={input.sourceDraftId || ''} inputProps={{ min: 1, step: 1 }} onChange={(event) => setInput({ ...input, sourceDraftId: Number(event.target.value) })} helperText="Use a manual invoice draft. Its values are copied into this schedule version." />
    <TextField label="First billing date" type="date" required disabled={Boolean(schedule)} value={input.startDate} InputLabelProps={{ shrink: true }} inputProps={{ min: billingDateToday() }} onChange={(event) => setInput({ ...input, startDate: event.target.value })} />
    <TextField label="Billing cadence" select disabled={Boolean(schedule)} value={input.intervalMonths} onChange={(event) => setInput({ ...input, intervalMonths: Number(event.target.value) as 1 | 3 | 12 })}>{[[1, 'Monthly'], [3, 'Quarterly'], [12, 'Yearly']].map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</TextField>
    <TextField label="Days until payment due" type="number" required value={input.dueDays} inputProps={{ min: 0, max: 3650, step: 1 }} onChange={(event) => setInput({ ...input, dueDays: Number(event.target.value) })} />
    <TextField label="Last billing date (optional)" type="date" value={input.endDate ?? ''} InputLabelProps={{ shrink: true }} inputProps={{ min: schedule?.nextPeriod ?? input.startDate }} onChange={(event) => setInput({ ...input, endDate: event.target.value || null })} />
  </Stack></DialogContent><DialogActions><AppButton onClick={onClose}>Close</AppButton><AppButton type="submit" variant="contained" isLoading={save.isPending}>Save paused version</AppButton></DialogActions></Stack></Dialog>;
}
