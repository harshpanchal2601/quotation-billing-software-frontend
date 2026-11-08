import { Alert, Dialog, DialogContent, DialogTitle, FormControlLabel, Checkbox, Stack, Tab, Tabs, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PERMISSIONS, useHasPermission } from '@features/auth';
import { toApiError } from '@shared/api/apiClient';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { AppButton } from '@shared/ui/actions';
import { PageContainer, PageHeader } from '@shared/ui/layout';
import { crmKeys, listCrm, type CrmKind, type CrmRecord } from './crm.api';
import { CrmRecordForm } from './CrmRecordForm';
import { LeadConversion } from './LeadConversion';
import { CustomerTimeline } from './CustomerTimeline';

export function CrmPage() { const firmId = useFirmId(); return <CrmWorkspace key={firmId} />; }
function CrmWorkspace() {
  const firmId = useFirmId(); const canManage = useHasPermission(PERMISSIONS.CRM_MANAGE); const canViewCompanies = useHasPermission(PERMISSIONS.COMPANIES_VIEW); const [params] = useSearchParams();
  const [kind, setKind] = useState<CrmKind>('leads'); const [page, setPage] = useState(1); const [search, setSearch] = useState(''); const [reminders, setReminders] = useState(false);
  const [editing, setEditing] = useState<CrmRecord | null | undefined>(); const [converting, setConverting] = useState<CrmRecord | null>(null); const [timeline, setTimeline] = useState<CrmRecord | null>(null);
  const companyId = Number(params.get('companyId')) || undefined;
  const queryParams = { page, limit: 20, search, ...(companyId ? { companyId } : {}), ...(reminders && kind === 'tasks' ? { reminders: 'true' } : {}) };
  const query = useQuery({ queryKey: [...crmKeys.firm(firmId), kind, queryParams], queryFn: ({ signal }) => listCrm(kind, queryParams, signal), enabled: firmId != null, refetchInterval: kind === 'tasks' ? 60000 : false });
  return <PageContainer><PageHeader title="CRM and follow-ups" description="Prospects, opportunity pipeline and customer activities" actions={canManage ? <AppButton onClick={() => setEditing(null)} variant="contained">Add {kind === 'leads' ? 'lead' : kind === 'opportunities' ? 'opportunity' : 'follow-up'}</AppButton> : undefined} />
    <Tabs value={kind} onChange={(_event, value: CrmKind) => { setKind(value); setPage(1); setSearch(''); }}>{(['leads', 'opportunities', 'tasks'] as const).map((value) => <Tab key={value} value={value} label={value === 'tasks' ? 'Follow-ups' : value} />)}</Tabs>
    <TextField label="Search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
    {kind === 'tasks' ? <FormControlLabel control={<Checkbox checked={reminders} onChange={(_event, checked) => { setReminders(checked); setPage(1); }} />} label="Show due reminders" /> : null}
    {query.isError ? <Alert severity="error">{toApiError(query.error).message}</Alert> : null}
    {query.isPending ? <Typography>Loading CRM…</Typography> : null}
    {kind === 'opportunities' ? <Stack direction="row" spacing={2} sx={{ overflowX: 'auto' }}>{['NEW', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'].map((stage) => <Stack key={stage} sx={{ minWidth: 170 }}><Typography fontWeight={600}>{stage}</Typography>{query.data?.records.filter((record) => record.stage === stage).map((record) => <Typography key={record.id}>{record.title} · {record.currency} {record.value} · {record.probability}%</Typography>)}</Stack>)}</Stack> : null}
    <Stack sx={{ overflowX: 'auto' }}><Table aria-label="CRM records"><TableHead><TableRow>{['Record', 'Company', 'Status / stage', 'Owner', 'Details', 'Actions'].map((label) => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead><TableBody>{query.data?.records.map((record) => <TableRow key={record.id}><TableCell>#{record.id} {record.name ?? record.title}</TableCell><TableCell>{record.companyId ? <Link to={`/companies/${record.companyId}`}>Company #{record.companyId}</Link> : 'Prospect'}</TableCell><TableCell>{record.stage ?? record.status}</TableCell><TableCell>#{record.ownerId ?? record.assignedToId}</TableCell><TableCell>{kind === 'opportunities' ? `${record.currency} ${record.value} · ${record.probability}%` : kind === 'tasks' ? `Due ${new Date(record.dueAt!).toLocaleString()}${record.reminderAt ? ` · Reminder ${new Date(record.reminderAt).toLocaleString()}` : ''}` : record.email ?? record.phone}</TableCell><TableCell><Stack direction="row">{canManage && record.status !== 'CONVERTED' ? <AppButton onClick={() => setEditing(record)}>Edit</AppButton> : null}{kind === 'leads' ? <><AppButton onClick={() => setTimeline(record)}>Timeline</AppButton>{canManage && canViewCompanies && !['CONVERTED', 'CLOSED'].includes(record.status ?? '') ? <AppButton onClick={() => setConverting(record)}>Convert</AppButton> : null}</> : null}</Stack></TableCell></TableRow>)}</TableBody></Table></Stack>
    {query.data?.records.length === 0 ? <Typography>No CRM records found.</Typography> : null}
    <Stack direction="row"><AppButton disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</AppButton><Typography>Page {page}</Typography><AppButton disabled={!query.data || page >= query.data.pagination.totalPages} onClick={() => setPage(page + 1)}>Next</AppButton></Stack>
    <Dialog open={editing !== undefined && canManage} onClose={() => setEditing(undefined)} fullWidth><DialogTitle>{editing ? 'Edit' : 'Create'} {kind}</DialogTitle><DialogContent>{editing !== undefined ? <CrmRecordForm key={`${kind}:${editing?.id ?? 'new'}`} kind={kind} record={editing} onSaved={() => setEditing(undefined)} /> : null}</DialogContent></Dialog>
    <Dialog open={converting !== null} onClose={() => setConverting(null)} fullWidth><DialogTitle>Convert lead</DialogTitle><DialogContent>{converting ? <LeadConversion lead={converting} onSaved={() => setConverting(null)} /> : null}</DialogContent></Dialog>
    <Dialog open={timeline !== null} onClose={() => setTimeline(null)} fullWidth><DialogTitle>Lead activity</DialogTitle><DialogContent>{timeline ? <CustomerTimeline key={timeline.id} leadId={timeline.id} /> : null}</DialogContent></Dialog>
  </PageContainer>;
}
