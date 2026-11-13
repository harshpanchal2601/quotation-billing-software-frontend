import { Alert, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { PERMISSIONS, useHasPermission } from '@features/auth';
import { toApiError } from '@shared/api/apiClient';
import { CommandForm } from '@shared/forms/CommandForm';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { AppButton } from '@shared/ui/actions';
import { formatRecordStatus, formatRecordValue } from '@shared/ui/display';
import { DetailActions, DetailSection } from '@shared/ui/layout';
import { RecordTable, useTableSort } from '@shared/ui/tables';
import { crmKeys, customerTimeline, recordActivity } from './crm.api';

const historyFields = { status: 'Status', stage: 'Stage', ownerId: 'Owner', assignedToId: 'Assigned to', dueAt: 'Due at', reminderAt: 'Reminder at', companyId: 'Company', probability: 'Probability' };
function historyValue(value: unknown, field: string) {
  if (typeof value !== 'string' && typeof value !== 'number') return '—';
  if (field === 'status' || field === 'stage') return formatRecordStatus(String(value));
  if (field === 'ownerId' || field === 'assignedToId') return `User #${value}`;
  if (field === 'companyId') return `Company #${value}`;
  if (field === 'probability') return `${value}%`;
  return formatRecordValue(value, field);
}

export function CustomerTimeline({ companyId, leadId }: { companyId?: number; leadId?: number }) {
  const canView = useHasPermission(PERMISSIONS.CRM_VIEW); const canManage = useHasPermission(PERMISSIONS.CRM_MANAGE); const firmId = useFirmId(); const cache = useQueryClient(); const [page, setPage] = useState(1);
  const sorting = useTableSort([{ key: 'id', label: 'Record number' }, { key: 'createdAt', label: 'Recorded date' }, { key: 'subject', label: 'Subject' }, { key: 'kind', label: 'Activity' }], { paramPrefix: 'activities', onChange: () => setPage(1) });
  const params = { page, limit: 20, sortBy: sorting.sortBy, sortOrder: sorting.sortOrder, ...(companyId ? { companyId } : {}), ...(leadId ? { leadId } : {}) };
  const query = useQuery({ queryKey: [...crmKeys.firm(firmId), 'timeline', params], queryFn: ({ signal }) => customerTimeline(params, signal), enabled: canView && firmId != null });
  if (!canView) return null;
  return <DetailSection title="Customer activity timeline" actions={canManage ? <CommandForm dialog title="Record activity" label="Save activity" successMessage="Activity recorded." saved={async () => { setPage(1); await cache.invalidateQueries({ queryKey: crmKeys.firm(firmId) }); }} submit={(data) => recordActivity({ companyId: companyId ?? null, leadId: leadId ?? null, kind: data.get('kind'), subject: data.get('subject'), notes: data.get('notes') || null })}>
    <TextField select name="kind" label="Activity" defaultValue="NOTE">{['NOTE', 'CALL', 'MEETING', 'EMAIL'].map((kind) => <MenuItem key={kind} value={kind}>{formatRecordStatus(kind)}</MenuItem>)}</TextField>
    <TextField name="subject" label="Subject" required inputProps={{ maxLength: 191 }} />
    <TextField name="notes" label="Notes" multiline inputProps={{ maxLength: 10000 }} />
  </CommandForm> : undefined}>
    {query.isError ? <Alert severity="error" action={<AppButton onClick={() => void query.refetch()}>Retry activities</AppButton>}>{toApiError(query.error).message}</Alert> : null}
    {query.isPending ? <Typography role="status">Loading activities…</Typography> : null}
    {query.data ? <RecordTable rows={query.data.records} sorting={sorting} rowNumberStart={(page - 1) * 20 + 1} label="Customer activities" rowKey={(activity) => activity.id} emptyMessage="No activities recorded. Record a note, call, meeting or email to keep the customer history together." columns={[
      { key: 'subject', sortKey: 'subject', label: 'Subject', minWidth: 220, render: (activity) => activity.subject },
      { key: 'kind', sortKey: 'kind', label: 'Activity', render: (activity) => formatRecordStatus(activity.kind) },
      { key: 'recordedBy', label: 'Recorded by', render: (activity) => activity.createdBy.name },
      { key: 'date', sortKey: 'createdAt', label: 'Recorded at', minWidth: 190, render: (activity) => new Date(activity.createdAt).toLocaleString() },
      { key: 'details', label: 'Details', minWidth: 280, render: (activity) => <Stack spacing={0.5}>
        {Object.entries(historyFields).filter(([field]) => activity.details?.after?.[field] !== undefined && (activity.details?.before?.[field] ?? null) !== (activity.details?.after?.[field] ?? null)).map(([field, label]) => <Typography variant="body2" key={field}>{label}: {historyValue(activity.details?.before?.[field], field)} → {historyValue(activity.details?.after?.[field], field)}</Typography>)}
        {activity.notes ? <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{activity.notes}</Typography> : null}
      </Stack> },
    ]} /> : null}
    <DetailActions label="Activity pages"><AppButton disabled={query.isFetching || page === 1} onClick={() => setPage(page - 1)}>Previous</AppButton><AppButton disabled={query.isFetching || !query.data || page >= query.data.pagination.totalPages} onClick={() => setPage(page + 1)}>Next</AppButton></DetailActions>
  </DetailSection>;
}
