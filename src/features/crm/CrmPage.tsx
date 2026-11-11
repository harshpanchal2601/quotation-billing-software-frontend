import { Alert, Chip, FormControlLabel, Checkbox, Stack, TextField, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PERMISSIONS, useHasPermission } from '@features/auth';
import { toApiError } from '@shared/api/apiClient';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { AppDialog } from '@shared/ui/dialogs';
import { AppButton } from '@shared/ui/actions';
import { PageContainer, PageHeader, WorkspaceTabs } from '@shared/ui/layout';
import { RecordPagination, RecordTable, useTableSort, type RecordColumn } from '@shared/ui/tables';
import { crmKeys, listCrm, type CrmKind, type CrmRecord } from './crm.api';
import { CrmRecordForm } from './CrmRecordForm';
import { LeadConversion } from './LeadConversion';
import { CustomerTimeline } from './CustomerTimeline';

const sortAliases: Record<string, string> = { close: 'expectedClose', due: 'dueAt', reminder: 'reminderAt' };
const labels: Record<CrmKind, string> = { leads: 'Leads', opportunities: 'Opportunities', tasks: 'Follow-ups' };
const readableStatus = (value?: string) => value ? value.toLowerCase().replace(/_/g, ' ').replace(/^./, (letter) => letter.toUpperCase()) : '—';
const dateTime = (value?: string | null) => value ? new Date(value).toLocaleString() : '—';

export function CrmPage() { const firmId = useFirmId(); return <CrmWorkspace key={firmId} />; }
function CrmWorkspace() {
  const compact = useMediaQuery(useTheme().breakpoints.down('sm'));
  const firmId = useFirmId(); const canManage = useHasPermission(PERMISSIONS.CRM_MANAGE); const canViewCompanies = useHasPermission(PERMISSIONS.COMPANIES_VIEW); const [params, setParams] = useSearchParams();
  const kind: CrmKind = params.get('tab') === 'opportunities' ? 'opportunities' : params.get('tab') === 'tasks' ? 'tasks' : 'leads';
  const requestedPage = Number(params.get('page'));
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 && requestedPage <= 100000 ? requestedPage : 1;
  const sortFields = [{ key: 'id', label: 'Record number' }, { key: 'createdAt', label: 'Created date' }, ...(kind === 'leads' ? [{ key: 'name', label: 'Lead' }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' }, { key: 'status', label: 'Status' }, { key: 'source', label: 'Source' }] : kind === 'opportunities' ? [{ key: 'title', label: 'Opportunity' }, { key: 'stage', label: 'Stage' }, { key: 'currency', label: 'Currency' }, { key: 'value', label: 'Value' }, { key: 'probability', label: 'Probability' }, { key: 'expectedClose', label: 'Expected close' }] : [{ key: 'title', label: 'Follow-up' }, { key: 'status', label: 'Status' }, { key: 'dueAt', label: 'Due date' }, { key: 'reminderAt', label: 'Reminder date' }])];
  const sorting = useTableSort(sortFields);
  const search = params.get('search') ?? ''; const reminders = params.get('reminders') === 'true';
  function updateFilters(changes: Record<string, string | undefined>) {
    setParams((current) => {
      const next = new URLSearchParams(current);
      Object.entries(changes).forEach(([key, value]) => { if (value) next.set(key, value); else next.delete(key); });
      return next;
    }, { replace: true });
  }
  const [editing, setEditing] = useState<CrmRecord | null | undefined>(); const [converting, setConverting] = useState<CrmRecord | null>(null); const [timeline, setTimeline] = useState<CrmRecord | null>(null);
  const requestedCompany = Number(params.get('companyId'));
  const companyId = Number.isSafeInteger(requestedCompany) && requestedCompany > 0 ? requestedCompany : undefined;
  const queryParams = { page, limit: 20, search, sortBy: sorting.sortBy, sortOrder: sorting.sortOrder, ...(companyId ? { companyId } : {}), ...(reminders && kind === 'tasks' ? { reminders: 'true' } : {}) };
  const query = useQuery({ queryKey: [...crmKeys.firm(firmId), kind, queryParams], queryFn: ({ signal }) => listCrm(kind, queryParams, signal), enabled: firmId != null, refetchInterval: kind === 'tasks' ? 60000 : false });
  const companyColumn: RecordColumn<CrmRecord> = { key: 'company', label: 'Company / prospect', render: (record) => record.companyId ? canViewCompanies ? <Link to={`/companies/${record.companyId}`}>{record.company?.name ?? `Company #${record.companyId}`}</Link> : record.company?.name ?? `Company #${record.companyId}` : record.lead?.name ?? 'Prospect' };
  const ownerColumn: RecordColumn<CrmRecord> = { key: 'owner', label: kind === 'tasks' ? 'Assigned to' : 'Owner', render: (record) => record.owner?.name ?? record.assignee?.name ?? (record.ownerId ?? record.assignedToId ? `User #${record.ownerId ?? record.assignedToId}` : 'Unassigned') };
  const statusColumn: RecordColumn<CrmRecord> = { key: 'status', sortKey: kind === 'opportunities' ? 'stage' : 'status', label: kind === 'opportunities' ? 'Stage' : 'Status', render: (record) => <Chip size="small" variant="outlined" label={readableStatus(record.stage ?? record.status)} /> };
  const actionsColumn: RecordColumn<CrmRecord> = { key: 'actions', label: 'Actions', render: (record) => <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>{canManage && record.status !== 'CONVERTED' ? <AppButton aria-label={`Edit ${record.name ?? record.title}`} onClick={() => setEditing(record)}>Edit</AppButton> : null}{kind === 'leads' ? <><AppButton onClick={() => setTimeline(record)}>Timeline</AppButton>{canManage && canViewCompanies && !['CONVERTED', 'CLOSED'].includes(record.status ?? '') ? <AppButton onClick={() => setConverting(record)}>Convert</AppButton> : null}</> : null}{!canManage && kind !== 'leads' ? '—' : null}</Stack> };
  const columns: RecordColumn<CrmRecord>[] = kind === 'leads' ? [
    { key: 'name', label: 'Lead', render: (record) => record.name },
    { key: 'email', label: 'Email', render: (record) => record.email ?? '—' },
    { key: 'phone', label: 'Phone', render: (record) => record.phone ?? '—' }, statusColumn, ownerColumn,
    { key: 'source', label: 'Source', render: (record) => record.source ?? '—' }, companyColumn, actionsColumn,
  ] : kind === 'opportunities' ? [
    { key: 'title', label: 'Opportunity', render: (record) => record.title }, companyColumn, statusColumn,
    { key: 'currency', label: 'Currency', render: (record) => record.currency ?? '—' },
    { key: 'value', label: 'Value', align: 'right', render: (record) => record.value ?? '—' },
    { key: 'probability', label: 'Probability', align: 'right', render: (record) => record.probability == null ? '—' : `${record.probability}%` },
    { key: 'close', label: 'Expected close', render: (record) => record.expectedClose?.slice(0, 10) ?? '—' }, ownerColumn, actionsColumn,
  ] : [
    { key: 'title', label: 'Follow-up', render: (record) => record.title }, companyColumn, statusColumn, ownerColumn,
    { key: 'due', label: 'Due at (local time)', render: (record) => dateTime(record.dueAt) },
    { key: 'reminder', label: 'Reminder (local time)', render: (record) => dateTime(record.reminderAt) },
    { key: 'notes', label: 'Notes', render: (record) => record.notes ?? '—' }, actionsColumn,
  ];
  return <PageContainer><PageHeader title="CRM and follow-ups" description="Prospects, opportunity pipeline and customer activities" actions={canManage ? <AppButton onClick={() => setEditing(null)} variant="contained">Add {kind === 'leads' ? 'lead' : kind === 'opportunities' ? 'opportunity' : 'follow-up'}</AppButton> : undefined} />
    <WorkspaceTabs value={kind} label="CRM records" items={[{ value: 'leads', label: 'Leads' }, { value: 'opportunities', label: 'Opportunities' }, { value: 'tasks', label: 'Follow-ups' }]} onChange={(value) => updateFilters({ tab: value, page: undefined, sortBy: undefined, sortOrder: undefined })} />
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}><TextField label={`Search ${labels[kind].toLowerCase()}`} value={search} onChange={(event) => updateFilters({ search: event.target.value, page: undefined })} sx={{ flex: 1, maxWidth: { sm: 420 } }} />
    {kind === 'tasks' ? <FormControlLabel control={<Checkbox checked={reminders} onChange={(_event, checked) => updateFilters({ reminders: checked ? 'true' : undefined, page: undefined })} />} label="Show due reminders" /> : null}</Stack>
    {companyId ? <Alert severity="info" action={<AppButton onClick={() => updateFilters({ companyId: undefined, page: undefined })}>Clear company filter</AppButton>}>Showing CRM records for company #{companyId}.</Alert> : null}
    {query.isError ? <Alert severity="error" action={<AppButton onClick={() => void query.refetch()}>Retry CRM records</AppButton>}>{toApiError(query.error).message}</Alert> : null}
    {query.isPending ? <Typography role="status">Loading CRM…</Typography> : null}
    {query.data && !query.isError ? <Stack aria-busy={query.isFetching}><RecordTable rows={query.data.records} label={labels[kind]} sorting={sorting} rowNumberStart={(page - 1) * 20 + 1} rowKey={(record) => record.id} emptyMessage={`No ${labels[kind].toLowerCase()} match these filters.${canManage ? ' Use Add to create a record.' : ''}`} columns={columns.map((column) => ({ ...column, sortKey: column.sortKey ?? (sortAliases[column.key] ?? column.key) }))} /><RecordPagination pagination={{ limit: 20, total: query.data.pagination.total }} page={page} change={(next) => updateFilters({ page: String(next) })} /></Stack> : null}
    {editing !== undefined && canManage ? <CrmRecordForm key={`${kind}:${editing?.id ?? 'new'}`} kind={kind} record={editing} onSaved={() => setEditing(undefined)} /> : null}
    {converting ? <LeadConversion key={converting.id} lead={converting} onSaved={() => setConverting(null)} /> : null}
    <AppDialog open={timeline !== null} onClose={() => setTimeline(null)} fullWidth fullScreen={compact} title="Lead activity" showCloseButton>{timeline ? <CustomerTimeline key={timeline.id} leadId={timeline.id} /> : null}</AppDialog>
  </PageContainer>;
}
