import { Alert, Autocomplete, MenuItem, Stack, TextField } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { PERMISSIONS, useHasPermission } from '@features/auth';
import { listQuotationsRequest } from '@features/quotations/api/quotations.api';
import { CommandForm } from '@shared/forms/CommandForm';
import { AppButton } from '@shared/ui/actions';
import { toApiError } from '@shared/api/apiClient';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { formatRecordStatus } from '@shared/ui/display';
import { crmKeys, crmOptions, listCrm, saveCrm, type CrmKind, type CrmRecord } from './crm.api';

export function CrmRecordForm({ kind, record, onSaved }: { kind: CrmKind; record: CrmRecord | null; onSaved: () => void }) {
  const firmId = useFirmId(); const cache = useQueryClient(); const [companySearch, setCompanySearch] = useState('');
  const canViewQuotations = useHasPermission(PERMISSIONS.QUOTATIONS_VIEW);
  const options = useQuery({ queryKey: [...crmKeys.firm(firmId), 'options', companySearch], queryFn: ({ signal }) => crmOptions(companySearch, signal) });
  function submit(data: FormData) {
    const value = (key: string) => String(data.get(key) ?? '').trim();
    const payload: Record<string, unknown> = kind === 'leads'
      ? { name: value('name'), email: value('email') || null, phone: value('phone') || null, source: value('source') || null, ownerId: Number(value('ownerId')), ...(record ? { status: value('status') } : {}) }
      : kind === 'opportunities'
        ? { title: value('title'), stage: value('stage'), ...(value('probability') ? { probability: Number(value('probability')) } : {}), value: value('value'), currency: value('currency'), ownerId: Number(value('ownerId')), source: value('source') || null, expectedClose: value('expectedClose') || null }
        : { title: value('title'), notes: value('notes') || null, assignedToId: Number(value('assignedToId')), dueAt: new Date(value('dueAt')).toISOString(), reminderAt: value('reminderAt') ? new Date(value('reminderAt')).toISOString() : null, ...(record ? { status: value('status') } : {}) };
    if (record) payload.expectedVersion = record.version;
    else if (kind !== 'leads') { payload.companyId = Number(value('companyId')) || null; payload.leadId = Number(value('leadId')) || null; if (kind === 'tasks') payload.opportunityId = Number(value('opportunityId')) || null; else payload.quotationId = Number(value('quotationId')) || null; }
    return saveCrm(kind, payload, record?.id);
  }
  const localTime = (value?: string | null) => value ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';
  const label = kind === 'leads' ? 'lead' : kind === 'opportunities' ? 'opportunity' : 'follow-up';
  return <CommandForm dialog initialOpen hideTrigger title={`${record ? 'Edit' : 'Create'} ${label}`} label={`Save ${label}`} isSubmitDisabled={!options.data} onClosed={onSaved} saved={() => cache.invalidateQueries({ queryKey: crmKeys.firm(firmId) })} successMessage={`${kind === 'leads' ? 'Lead' : kind === 'opportunities' ? 'Opportunity' : 'Follow-up'} saved.`} submit={submit}>
    {options.isError ? <Alert severity="error">{toApiError(options.error).message}</Alert> : null}
    {options.isPending ? <Stack role="status">Loading reference options…</Stack> : null}
    {options.isError ? <AppButton onClick={() => void options.refetch()}>Retry CRM options</AppButton> : null}
    <TextField name={kind === 'leads' ? 'name' : 'title'} label={kind === 'leads' ? 'Prospect name' : 'Title'} defaultValue={record?.name ?? record?.title ?? ''} required inputProps={{ maxLength: 191 }} />
    <TextField select name={kind === 'tasks' ? 'assignedToId' : 'ownerId'} label={kind === 'tasks' ? 'Assigned to' : 'Owner'} defaultValue={record?.ownerId ?? record?.assignedToId ?? ''} required>{options.data?.owners.map((owner) => <MenuItem key={owner.id} value={owner.id}>{owner.name}</MenuItem>)}</TextField>
    {kind === 'leads' ? <><TextField name="email" type="email" label="Email" defaultValue={record?.email ?? ''} /><TextField name="phone" label="Phone" defaultValue={record?.phone ?? ''} /></> : null}
    {kind !== 'tasks' ? <TextField name="source" label="Source" defaultValue={record?.source ?? ''} /> : null}
    {!record && kind !== 'leads' ? <>
      <TextField label="Find existing company" value={companySearch} onChange={(event) => setCompanySearch(event.target.value)} />
      <TextField select name="companyId" label="Existing company (optional)" defaultValue=""><MenuItem value="">No company yet</MenuItem>{options.data?.companies.map((company) => <MenuItem key={company.id} value={company.id}>{company.name}</MenuItem>)}</TextField>
      <CrmRelatedRecordField kind="leads" name="leadId" label="Source lead (optional)" />
      {kind === 'tasks' ? <CrmRelatedRecordField kind="opportunities" name="opportunityId" label="Opportunity (optional)" /> : canViewQuotations ? <CrmRelatedRecordField kind="quotations" name="quotationId" label="Quotation (optional)" /> : null}
    </> : null}
    {kind === 'opportunities' ? <>
      <TextField select name="stage" label="Stage" defaultValue={record?.stage ?? 'NEW'}>{Object.keys(options.data?.stages ?? { NEW: 10, QUALIFIED: 25, PROPOSAL: 50, NEGOTIATION: 75, WON: 100, LOST: 0 }).map((stage) => <MenuItem key={stage} value={stage}>{formatRecordStatus(stage)}</MenuItem>)}</TextField>
      <TextField name="probability" type="number" label="Probability % (optional override)" defaultValue={record?.probability ?? ''} inputProps={{ min: 0, max: 100 }} />
      <TextField name="value" label="Opportunity value" defaultValue={record?.value ?? '0'} required inputProps={{ inputMode: 'decimal', pattern: '\\d+(\\.\\d{1,3})?' }} />
      <TextField name="currency" label="Currency" defaultValue={record?.currency ?? 'INR'} required inputProps={{ pattern: '[A-Z]{3}', maxLength: 3 }} />
      <TextField name="expectedClose" label="Expected close" type="date" defaultValue={record?.expectedClose?.slice(0, 10) ?? ''} InputLabelProps={{ shrink: true }} />
    </> : null}
    {kind === 'tasks' ? <><TextField name="notes" label="Follow-up notes" multiline defaultValue={record?.notes ?? ''} /><TextField name="dueAt" label="Due at" type="datetime-local" required defaultValue={localTime(record?.dueAt)} InputLabelProps={{ shrink: true }} /><TextField name="reminderAt" label="Reminder at" type="datetime-local" defaultValue={localTime(record?.reminderAt)} InputLabelProps={{ shrink: true }} /></> : null}
    {record && kind !== 'opportunities' ? <TextField select name="status" label="Status" defaultValue={record.status}>{(kind === 'leads' ? ['NEW', 'QUALIFIED', 'CLOSED'] : ['OPEN', 'DONE', 'CANCELLED']).map((status) => <MenuItem key={status} value={status}>{formatRecordStatus(status)}</MenuItem>)}</TextField> : null}
  </CommandForm>;
}

type RelatedChoice = { id: number; label: string };
function CrmRelatedRecordField({ kind, name, label }: { kind: 'leads' | 'opportunities' | 'quotations'; name: string; label: string }) {
  const firmId = useFirmId();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [value, setValue] = useState<RelatedChoice | null>(null);
  useEffect(() => { const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250); return () => window.clearTimeout(timer); }, [search]);
  const query = useQuery({
    queryKey: [...crmKeys.firm(firmId), 'related-records', kind, debouncedSearch],
    enabled: firmId != null,
    queryFn: async ({ signal }): Promise<RelatedChoice[]> => kind === 'quotations'
      ? (await listQuotationsRequest({ search: debouncedSearch, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' })).quotations.map((row) => ({ id: row.id, label: `${row.quotationNumber} · Revision ${row.revisionNumber} · ${row.companyNameSnapshot}` }))
      : (await listCrm(kind, { search: debouncedSearch, limit: 20, sortBy: 'id', sortOrder: 'desc' }, signal)).records.map((row) => ({ id: row.id, label: `${row.name ?? row.title}${row.company?.name ? ` · ${row.company.name}` : ''}` })),
  });
  const choices = value && !query.data?.some((row) => row.id === value.id) ? [value, ...(query.data ?? [])] : query.data ?? [];
  return <Stack spacing={1}>
    <input type="hidden" name={name} value={value?.id ?? ''} />
    <Autocomplete options={choices} value={value} loading={query.isFetching} filterOptions={(rows) => rows} getOptionLabel={(row) => row.label} isOptionEqualToValue={(left, right) => left.id === right.id} noOptionsText="No matching records. Try a different search." onInputChange={(_, text, reason) => { if (reason === 'input' || reason === 'clear') { setSearch(text); setValue(null); } }} onChange={(_, choice) => { setValue(choice); setSearch(''); }} renderInput={(params) => <TextField {...params} label={label} helperText="Search by name or quotation number, then select a record to link it." />} />
    {query.isError ? <Alert severity="error" action={<AppButton onClick={() => void query.refetch()}>Retry choices</AppButton>}>{toApiError(query.error).message}</Alert> : null}
  </Stack>;
}
