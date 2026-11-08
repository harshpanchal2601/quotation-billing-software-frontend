import { Alert, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { PERMISSIONS, useHasPermission } from '@features/auth';
import { toApiError } from '@shared/api/apiClient';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { AppButton } from '@shared/ui/actions';
import { crmKeys, customerTimeline, recordActivity } from './crm.api';

const historyFields = { status: 'Status', stage: 'Stage', ownerId: 'Owner', assignedToId: 'Assigned to', dueAt: 'Due at', reminderAt: 'Reminder at', companyId: 'Company', probability: 'Probability' };
function historyValue(value: unknown) { return typeof value === 'string' || typeof value === 'number' ? String(value) : '—'; }

export function CustomerTimeline({ companyId, leadId }: { companyId?: number; leadId?: number }) {
  const canView = useHasPermission(PERMISSIONS.CRM_VIEW); const canManage = useHasPermission(PERMISSIONS.CRM_MANAGE); const firmId = useFirmId(); const cache = useQueryClient(); const [page, setPage] = useState(1);
  const query = useQuery({ queryKey: [...crmKeys.firm(firmId), 'timeline', companyId, leadId, page], queryFn: ({ signal }) => customerTimeline({ page, ...(companyId ? { companyId } : {}), ...(leadId ? { leadId } : {}) }, signal), enabled: canView && firmId != null });
  const mutation = useMutation({ mutationFn: recordActivity, onSuccess: () => cache.invalidateQueries({ queryKey: crmKeys.firm(firmId) }) });
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); mutation.mutate({ companyId: companyId ?? null, leadId: leadId ?? null, kind: data.get('kind'), subject: data.get('subject'), notes: data.get('notes') || null }); }
  if (!canView) return null;
  return <Stack spacing={2}><Typography variant="h6">Customer activity timeline</Typography>
    {query.isError || mutation.isError ? <Alert severity="error">{toApiError(query.error ?? mutation.error).message}</Alert> : null}
    {query.isPending ? <Typography>Loading activities…</Typography> : null}
    {canManage ? <Stack component="form" onSubmit={submit} spacing={1}><TextField select name="kind" label="Activity" defaultValue="NOTE">{['NOTE', 'CALL', 'MEETING', 'EMAIL'].map((kind) => <MenuItem key={kind} value={kind}>{kind}</MenuItem>)}</TextField><TextField name="subject" label="Subject" required inputProps={{ maxLength: 191 }} /><TextField name="notes" label="Notes" multiline inputProps={{ maxLength: 10000 }} /><AppButton type="submit" disabled={mutation.isPending}>Record activity</AppButton></Stack> : null}
    {query.data?.records.map((activity) => <Stack key={activity.id}><Typography fontWeight={600}>{activity.subject}</Typography><Typography variant="caption">{activity.kind} · {activity.createdBy.name} · {new Date(activity.createdAt).toLocaleString()}</Typography>{Object.entries(historyFields).filter(([field]) => activity.details?.after?.[field] !== undefined && activity.details?.before?.[field] !== activity.details?.after?.[field]).map(([field, label]) => <Typography key={field}>{label}: {historyValue(activity.details?.before?.[field])} → {historyValue(activity.details?.after?.[field])}</Typography>)}{activity.notes ? <Typography sx={{ whiteSpace: 'pre-wrap' }}>{activity.notes}</Typography> : null}</Stack>)}
    {query.data?.records.length === 0 ? <Typography>No activities recorded.</Typography> : null}
    <Stack direction="row"><AppButton disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</AppButton><AppButton disabled={!query.data || page >= query.data.pagination.totalPages} onClick={() => setPage(page + 1)}>Next</AppButton></Stack>
  </Stack>;
}
