import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toApiError } from '@shared/api/apiClient';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { AppButton } from '@shared/ui/actions';
import { PageContainer, PageHeader } from '@shared/ui/layout';
import { controlRun, listDefinitions, listRecipients, listRuns, listVersions, previewDefinition, publishDefinition, rollbackDefinition } from '../api/automation.api';
import { DefinitionEditor } from '../components/DefinitionEditor';
import { definitionKey, initialDefinition, triggerEntities, type Definition, type DefinitionKind, type PublishedDefinition, type Workflow } from '../model/automation.types';

const categories: Array<[DefinitionKind, string]> = [['WORKFLOW', 'Workflows'], ['APPROVAL', 'Approval policies'], ['NOTIFICATION', 'Notification rules'], ['TEMPLATE', 'Document templates'], ['CUSTOM_FIELDS', 'Custom fields']];
export function AutomationPage() {
  const firmId = useFirmId();
  return <AutomationWorkspace key={firmId} />;
}
function AutomationWorkspace() {
  const firmId = useFirmId(); const cache = useQueryClient();
  const [kind, setKind] = useState<DefinitionKind>('WORKFLOW');
  const [definition, setDefinition] = useState<Definition>(() => initialDefinition('WORKFLOW'));
  const [workflowKey, setWorkflowKey] = useState('new-workflow');
  const [editingBase, setEditingBase] = useState<{ kind: DefinitionKind; key: string; version: number } | null>(null);
  const [history, setHistory] = useState<PublishedDefinition | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [runPage, setRunPage] = useState(1);
  const [notice, setNotice] = useState('');
  const [example, setExample] = useState({ status: 'ISSUED', currency: 'INR', total: '100.00', discountPercent: '10' });
  const key = definitionKey(definition, workflowKey);
  const heads = useQuery({ queryKey: ['automation', firmId, kind], queryFn: () => listDefinitions(kind) });
  const recipients = useQuery({ queryKey: ['automation-recipients', firmId], queryFn: listRecipients });
  const runs = useQuery({ queryKey: ['automation-runs', firmId, runPage], queryFn: () => listRuns(runPage), refetchInterval: 15000 });
  const versions = useQuery({ queryKey: ['automation-history', firmId, history?.kind, history?.key, historyPage], queryFn: () => listVersions(history!.kind, history!.key, historyPage), enabled: history !== null });
  const current = heads.data?.find((row) => row.key === key);
  const expectedVersion = editingBase?.kind === kind && editingBase.key === key ? editingBase.version : 0;
  async function refresh() { await cache.invalidateQueries({ queryKey: ['automation', firmId] }); await cache.invalidateQueries({ queryKey: ['automation-history', firmId] }); }
  const publish = useMutation({ mutationFn: () => publishDefinition(kind, key, expectedVersion, definition), onSuccess: async (saved) => { setEditingBase({ kind: saved.definition.kind, key: saved.definition.key, version: saved.definition.version }); setDefinition(structuredClone(saved.definition.definition)); setNotice('New version published. Existing runs and documents retain their snapshots.'); await refresh(); } });
  const rollback = useMutation({ mutationFn: (version: number) => rollbackDefinition(history!.kind, history!.key, history!.version, version), onSuccess: async () => { setNotice('Historical settings republished as a new version.'); setHistory(null); await refresh(); } });
  const preview = useMutation({ mutationFn: () => {
    const workflow = definition as Workflow;
    const event = kind === 'WORKFLOW' || kind === 'NOTIFICATION' ? { trigger: workflow.trigger, entity: triggerEntities[workflow.trigger], entityId: 1, businessName: 'Example business', documentNumber: 'PREVIEW-001', ...example } : undefined;
    return previewDefinition(kind, key, definition, event);
  } });
  const control = useMutation({ mutationFn: ({ id, command }: { id: string; command: 'RETRY' | 'CANCEL' }) => controlRun(id, command), onSuccess: () => cache.invalidateQueries({ queryKey: ['automation-runs', firmId] }) });
  function edit(row: PublishedDefinition) { setDefinition(structuredClone(row.definition)); setWorkflowKey(row.key); setEditingBase({ kind: row.kind, key: row.key, version: row.version }); preview.reset(); setNotice(''); }
  const busy = publish.isPending || rollback.isPending;
  return <PageContainer><PageHeader title="Automation settings" description="Configure tenant behavior within your subscription and team permissions." />
    <Alert severity="info">Workflows send in-app notifications only. Financial actions remain explicit domain commands with approval checks. Published settings are immutable.</Alert>
    {notice ? <Alert severity="success">{notice}</Alert> : null}
    {[heads.error, recipients.error, publish.error, rollback.error, control.error].filter(Boolean).map((error, index) => <Alert severity="error" key={index}>{toApiError(error).message}<AppButton onClick={() => { void heads.refetch(); void recipients.refetch(); }}>Reload</AppButton></Alert>)}
    <TextField select label="Configuration category" value={kind} disabled={busy} onChange={(event) => { const next = event.target.value as DefinitionKind; setKind(next); setDefinition(initialDefinition(next)); setWorkflowKey('new-workflow'); setEditingBase(null); setHistory(null); publish.reset(); preview.reset(); setNotice(''); }}>{categories.map(([value, title]) => <MenuItem key={value} value={value}>{title}</MenuItem>)}</TextField>
    <Stack spacing={1}>{heads.data?.map((row) => <Paper variant="outlined" sx={{ p: 2 }} key={row.id}><Stack direction="row" spacing={2} alignItems="center"><Typography sx={{ flex: 1 }}>{row.key} · Version {row.version} · {row.definition.enabled ? 'Enabled' : 'Disabled'}</Typography><AppButton disabled={busy} onClick={() => edit(row)}>Edit</AppButton><AppButton disabled={busy} onClick={() => { setHistory(row); setHistoryPage(1); }}>History</AppButton></Stack></Paper>)}</Stack>
    <Paper variant="outlined" sx={{ p: 2 }}><Stack component="form" spacing={2} onSubmit={(event) => { event.preventDefault(); publish.mutate(); }}>
      <Typography variant="h6">{current ? `Publish changes to ${key}` : 'Create configuration'}</Typography>
      {kind === 'WORKFLOW' || kind === 'NOTIFICATION' ? <TextField label="Permanent rule key" disabled={busy} value={workflowKey} onChange={(event) => setWorkflowKey(event.target.value)} helperText="Letters, numbers, underscores and hyphens; start with a letter." /> : null}
      {current && expectedVersion === 0 ? <Alert severity="info">This configuration already exists. Load its settings before editing.<AppButton onClick={() => edit(current)}>Load existing configuration</AppButton></Alert> : null}
      <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}><DefinitionEditor key={kind} kind={kind} value={definition} onChange={(value) => { setDefinition(value); preview.reset(); }} recipients={recipients.data ?? []} /></fieldset>
      {kind === 'WORKFLOW' || kind === 'NOTIFICATION' ? <Stack spacing={1}><Typography variant="subtitle1">Example event for preview</Typography>{Object.entries(example).map(([field, value]) => <TextField key={field} label={`Example ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`} value={value} onChange={(event) => { setExample({ ...example, [field]: event.target.value }); preview.reset(); }} />)}</Stack> : null}
      {preview.isError ? <Alert severity="error">{toApiError(preview.error).message}</Alert> : null}
      {preview.isSuccess ? <PreviewResult value={preview.data} /> : null}
      <Stack direction="row" spacing={1}><AppButton disabled={busy || preview.isPending || heads.isPending} onClick={() => preview.mutate()}>Validate and preview</AppButton><AppButton type="submit" disabled={busy || heads.isPending || heads.isError || Boolean(current && expectedVersion === 0)}>Publish version {expectedVersion + 1}</AppButton><AppButton disabled={busy} onClick={() => { setDefinition(initialDefinition(kind)); setWorkflowKey('new-workflow'); setEditingBase(null); preview.reset(); }}>New configuration</AppButton></Stack>
    </Stack></Paper>
    <Typography variant="h6">Workflow runs</Typography>
    {runs.isPending ? <Typography role="status">Loading workflow runs…</Typography> : null}
    {runs.isError ? <Alert severity="error">{toApiError(runs.error).message}<AppButton onClick={() => void runs.refetch()}>Retry</AppButton></Alert> : null}
    {runs.data?.length === 0 ? <Typography>No workflow runs yet.</Typography> : null}
    {runs.data?.map((run) => <Paper variant="outlined" sx={{ p: 2 }} key={run.id}><Stack spacing={1}>
      <Typography>{run.definition.key} · Version {run.definition.version} · {run.status}</Typography><Typography variant="body2">Actor {run.actorId} · {run.reason ?? 'Awaiting worker'} · Source {run.sourceEventId} · Expires {new Date(run.expiresAt).toLocaleString()}</Typography>
      {run.actions.map((action) => <Typography variant="body2" key={action.id}>{action.step}: {action.outcome}</Typography>)}
      {run.logs?.map((entry) => <Typography variant="body2" key={entry.id}>{new Date(entry.createdAt).toLocaleString()} · User {entry.userId} · {entry.newValues?.reason ?? entry.newValues?.status ?? 'Run updated'}{entry.newValues?.recipientId ? ` · Recipient ${entry.newValues.recipientId}` : ''}</Typography>)}
      {run.jobs.map((job) => <Stack spacing={0.5} key={job.id}><Typography variant="body2">{job.kind}: {job.status} · {job.attempts} attempts · Available {new Date(job.availableAt).toLocaleString()}</Typography>{job.jobAttempts.map((attempt) => <Typography variant="caption" key={attempt.id}>Attempt {attempt.attempt}: {attempt.outcome ?? 'Running'} {attempt.errorCode ?? ''}</Typography>)}</Stack>)}
      <Stack direction="row" spacing={1}><AppButton disabled={control.isPending || run.status === 'CANCELLED'} onClick={() => control.mutate({ id: run.id, command: 'CANCEL' })}>Cancel remaining actions</AppButton><AppButton disabled={control.isPending || !run.jobs.some((job) => job.status === 'DEAD') || run.status === 'CANCELLED'} onClick={() => control.mutate({ id: run.id, command: 'RETRY' })}>Retry failed actions</AppButton></Stack>
    </Stack></Paper>)}
    <Stack direction="row" spacing={1}><AppButton disabled={runPage === 1} onClick={() => setRunPage((page) => page - 1)}>Previous runs</AppButton><AppButton disabled={(runs.data?.length ?? 0) < 50} onClick={() => setRunPage((page) => page + 1)}>More runs</AppButton></Stack>
    <Dialog open={history !== null} onClose={() => setHistory(null)} fullWidth><DialogTitle>Published version history</DialogTitle><DialogContent><Stack spacing={2}>{versions.isPending ? <Typography>Loading history…</Typography> : null}{versions.isError ? <Alert severity="error">{toApiError(versions.error).message}</Alert> : null}{versions.data?.map((version) => <Stack spacing={1} key={version.id}><Typography>Version {version.version} · Published by {version.publishedById} · {new Date(version.publishedAt).toLocaleString()}</Typography><AppButton disabled={rollback.isPending} onClick={() => rollback.mutate(version.version)}>Republish version {version.version}</AppButton></Stack>)}<Stack direction="row"><AppButton disabled={historyPage === 1} onClick={() => setHistoryPage((page) => page - 1)}>Previous</AppButton><AppButton disabled={(versions.data?.length ?? 0) < 50} onClick={() => setHistoryPage((page) => page + 1)}>More</AppButton><AppButton onClick={() => setHistory(null)}>Close</AppButton></Stack></Stack></DialogContent></Dialog>
  </PageContainer>;
}
function PreviewResult({ value }: { value: unknown }) {
  const result = value as { steps?: Array<{ id: string; type: string }>; heading?: string; footer?: string; valid?: boolean };
  return <Alert severity="success"><Stack><Typography>Preview completed without side effects.</Typography>{result.steps ? <Typography>{result.steps.map((step) => step.type.toLowerCase()).join(' → ') || 'The rule does not match this example event.'}</Typography> : null}{result.heading !== undefined ? <Typography sx={{ whiteSpace: 'pre-wrap' }}>{result.heading}</Typography> : null}{result.footer !== undefined ? <Typography sx={{ whiteSpace: 'pre-wrap' }}>{result.footer}</Typography> : null}</Stack></Alert>;
}
