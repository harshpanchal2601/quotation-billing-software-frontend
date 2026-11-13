import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toApiError } from '@shared/api/apiClient';
import { EmptyState } from '@shared/components/common/EmptyState';
import { ErrorState } from '@shared/components/common/ErrorState';
import { CommandForm } from '@shared/forms/CommandForm';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { AppButton } from '@shared/ui/actions';
import { AppDialog, ConfirmDialog } from '@shared/ui/dialogs';
import { formatBusinessAction, formatRecordStatus } from '@shared/ui/display';
import { useNotification } from '@shared/ui/feedback';
import { DetailFields, DetailSection, PageContainer, PageHeader } from '@shared/ui/layout';
import { DataTableShell, RecordTable, TableSkeleton, TableSortControls, useTableSort } from '@shared/ui/tables';
import { controlRun, listDefinitions, listRecipients, listRuns, listVersions, previewDefinition, publishDefinition, rollbackDefinition } from '../api/automation.api';
import { DefinitionEditor } from '../components/DefinitionEditor';
import { definitionKey, initialDefinition, triggerEntities, type Definition, type DefinitionKind, type PublishedDefinition, type Run, type Workflow } from '../model/automation.types';

const categories: Array<[DefinitionKind, string]> = [['WORKFLOW', 'Workflows'], ['APPROVAL', 'Approval policies'], ['NOTIFICATION', 'Notification rules'], ['TEMPLATE', 'Document templates'], ['CUSTOM_FIELDS', 'Custom fields']];
const runSortFields = [{ key: 'createdAt', label: 'Created' }, { key: 'status', label: 'Status' }, { key: 'expiresAt', label: 'Expires' }, { key: 'actorId', label: 'Requester number' }];
const versionSortFields = [{ key: 'version', label: 'Version' }, { key: 'publishedAt', label: 'Published' }, { key: 'publishedById', label: 'Published by' }];

export function AutomationPage() {
  const firmId = useFirmId();
  return <AutomationWorkspace key={firmId} />;
}
function AutomationWorkspace() {
  const firmId = useFirmId(); const cache = useQueryClient(); const notify = useNotification();
  const [workspaceParams, setWorkspaceParams] = useSearchParams();
  const requestedKind = workspaceParams.get('category');
  const kind = categories.some(([value]) => value === requestedKind) ? requestedKind as DefinitionKind : 'WORKFLOW';
  const [definition, setDefinition] = useState<Definition>(() => initialDefinition('WORKFLOW'));
  const [workflowKey, setWorkflowKey] = useState('new-workflow');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingBase, setEditingBase] = useState<PublishedDefinition | null>(null);
  const [history, setHistory] = useState<PublishedDefinition | null>(null);
  const [historyPage, setHistoryPage] = useState(1); const [runPage, setRunPage] = useState(1);
  const [selectedRun, setSelectedRun] = useState<Run | null>(null);
  const [republishVersion, setRepublishVersion] = useState<number | null>(null);
  const [runCommand, setRunCommand] = useState<{ id: string; command: 'RETRY' | 'CANCEL' } | null>(null);
  const [example, setExample] = useState({ status: 'ISSUED', currency: 'INR', total: '100.00', discountPercent: '10' });
  const runSorting = useTableSort(runSortFields, { defaultSortBy: 'createdAt', paramPrefix: 'runs', onChange: () => setRunPage(1) });
  const versionSorting = useTableSort(versionSortFields, { defaultSortBy: 'version', paramPrefix: 'versions', onChange: () => setHistoryPage(1) });
  const runSort = { sortBy: runSorting.sortBy, sortOrder: runSorting.sortOrder };
  const versionSort = { sortBy: versionSorting.sortBy, sortOrder: versionSorting.sortOrder };
  const key = definitionKey(definition, workflowKey);
  const heads = useQuery({ queryKey: ['automation', firmId, kind], queryFn: () => listDefinitions(kind) });
  const recipients = useQuery({ queryKey: ['automation-recipients', firmId], queryFn: listRecipients, enabled: editorOpen && (kind === 'WORKFLOW' || kind === 'NOTIFICATION') });
  const runs = useQuery({ queryKey: ['automation-runs', firmId, runPage, runSort], queryFn: () => listRuns(runPage, runSort), refetchInterval: 15000 });
  const versions = useQuery({ queryKey: ['automation-history', firmId, history?.kind, history?.key, historyPage, versionSort], queryFn: () => listVersions(history!.kind, history!.key, historyPage, versionSort), enabled: history !== null });
  const current = heads.data?.find((row) => row.key === key);
  const expectedVersion = editingBase?.kind === kind && editingBase.key === key ? editingBase.version : 0;
  const refresh = () => Promise.all([
    cache.invalidateQueries({ queryKey: ['automation', firmId] }, { throwOnError: true }),
    cache.invalidateQueries({ queryKey: ['automation-history', firmId] }, { throwOnError: true }),
  ]);
  const rollback = useMutation({
    mutationFn: (version: number) => rollbackDefinition(history!.kind, history!.key, history!.version, version),
    onSuccess: async () => { setRepublishVersion(null); setHistory(null); notify('Historical settings saved as a new version.'); try { await refresh(); } catch { notify('Settings saved, but the list could not refresh. Refresh the page.', 'warning'); } },
    onError: (error) => notify(toApiError(error).message, 'error'),
  });
  const preview = useMutation({ mutationFn: () => {
    const workflow = definition as Workflow;
    const event = kind === 'WORKFLOW' || kind === 'NOTIFICATION' ? { trigger: workflow.trigger, entity: triggerEntities[workflow.trigger], entityId: 1, businessName: 'Example business', documentNumber: 'PREVIEW-001', ...example } : undefined;
    return previewDefinition(kind, key, definition, event);
  } });
  const control = useMutation({ mutationFn: (command: { id: string; command: 'RETRY' | 'CANCEL' }) => controlRun(command.id, command.command), onSuccess: async () => {
    setRunCommand(null); setSelectedRun(null); notify('Workflow run updated.');
    try { await cache.invalidateQueries({ queryKey: ['automation-runs', firmId] }, { throwOnError: true }); } catch { notify('The run was updated, but its history could not refresh.', 'warning'); }
  }, onError: (error) => notify(toApiError(error).message, 'error') });
  function edit(row?: PublishedDefinition) {
    setDefinition(row ? structuredClone(row.definition) : initialDefinition(kind)); setWorkflowKey(row?.key ?? 'new-workflow'); setEditingBase(row ?? null); preview.reset(); setEditorOpen(true);
  }
  return <PageContainer>
    <PageHeader title="Automation settings" description="Manage business rules, document templates and additional fields." actions={<AppButton variant="contained" onClick={() => edit()}>Create configuration</AppButton>} />
    <Alert severity="info">Workflows send notifications within this application. Financial actions still require an explicit request and any necessary approval. Saved versions and existing document snapshots are preserved.</Alert>
    <TextField select label="Configuration category" value={kind} onChange={(event) => { setWorkspaceParams((currentParams) => { const next = new URLSearchParams(currentParams); next.set('category', event.target.value); return next; }, { replace: true }); setHistory(null); }}>{categories.map(([value, title]) => <MenuItem key={value} value={value}>{title}</MenuItem>)}</TextField>
    <DataTableShell wrapInTableContainer={false} isLoading={heads.isPending} isError={heads.isError} isEmpty={!heads.data?.length} loadingContent={<TableSkeleton rowCount={3} />} errorContent={<ErrorState message={toApiError(heads.error).message} onRetry={() => void heads.refetch()} />} emptyContent={<EmptyState title="No configurations" description="Create a configuration to manage rules or document settings for your firm." />}>
      <RecordTable rows={heads.data ?? []} rowKey={(row) => row.id} label="Published configurations" columns={[
        { key: 'key', label: 'Configuration', minWidth: 240, sortValue: (row) => row.key, render: (row) => 'name' in row.definition ? row.definition.name : formatBusinessAction(row.key) },
        { key: 'version', label: 'Version', sortValue: (row) => row.version, render: (row) => row.version },
        { key: 'enabled', label: 'Status', sortValue: (row) => row.definition.enabled, render: (row) => <Chip size="small" color={row.definition.enabled ? 'success' : 'default'} variant="outlined" label={row.definition.enabled ? 'Enabled' : 'Disabled'} /> },
        { key: 'published', label: 'Published', sortValue: (row) => row.publishedAt, render: (row) => new Date(row.publishedAt).toLocaleString() },
        { key: 'actions', label: 'Actions', minWidth: 220, render: (row) => <Stack direction="row" spacing={1}><AppButton size="small" variant="outlined" onClick={() => edit(row)}>Edit</AppButton><AppButton size="small" onClick={() => { setHistory(row); setHistoryPage(1); }}>History</AppButton></Stack> },
      ]} />
    </DataTableShell>
    {editorOpen ? <CommandForm dialog initialOpen hideTrigger title={editingBase ? `Edit ${key}` : 'Create configuration'} label={`Save version ${expectedVersion + 1}`} onClosed={() => setEditorOpen(false)} successMessage="Configuration version saved. Existing records retain their previous settings."
      isSubmitDisabled={heads.isPending || heads.isError || preview.isPending || Boolean(current && expectedVersion === 0)} submit={() => publishDefinition(kind, key, expectedVersion, definition)} saved={refresh}>
      <input type="hidden" name="configuration" value={JSON.stringify({ kind, key, expectedVersion, definition })} />
      {kind === 'WORKFLOW' || kind === 'NOTIFICATION' ? <TextField label="Permanent rule key" value={workflowKey} onChange={(event) => { setWorkflowKey(event.target.value); preview.reset(); }} helperText="Letters, numbers, underscores and hyphens; start with a letter." /> : null}
      {current && expectedVersion === 0 ? <Alert severity="info">This configuration already exists. Load its settings before editing.<AppButton onClick={() => { setDefinition(structuredClone(current.definition)); setWorkflowKey(current.key); setEditingBase(current); preview.reset(); }}>Load existing configuration</AppButton></Alert> : null}
      {recipients.isError ? <ErrorState message={toApiError(recipients.error).message} onRetry={() => void recipients.refetch()} /> : null}
      <DefinitionEditor key={kind} kind={kind} value={definition} onChange={(value) => { setDefinition(value); preview.reset(); }} recipients={recipients.data ?? []} />
      {kind === 'WORKFLOW' || kind === 'NOTIFICATION' ? <DetailSection title="Example event for preview">{Object.entries(example).map(([field, value]) => <TextField key={field} label={`Example ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`} value={value} onChange={(event) => { setExample({ ...example, [field]: event.target.value }); preview.reset(); }} />)}</DetailSection> : null}
      {preview.isError ? <Alert severity="error">{toApiError(preview.error).message}</Alert> : null}
      {preview.isSuccess ? <PreviewResult value={preview.data} /> : null}
      <AppButton variant="outlined" disabled={heads.isPending || heads.isError} isLoading={preview.isPending} onClick={() => preview.mutate()}>Validate and preview</AppButton>
    </CommandForm> : null}
    <DetailSection title="Workflow runs" description="Review the activity and outcomes of your business rules.">
      <Stack spacing={2}><TableSortControls {...runSorting} />
        <DataTableShell wrapInTableContainer={false} isLoading={runs.isPending} isError={runs.isError} isEmpty={!runs.data?.length} loadingContent={<TableSkeleton rowCount={3} />} errorContent={<ErrorState message={toApiError(runs.error).message} onRetry={() => void runs.refetch()} />} emptyContent={<EmptyState title="No workflow runs" description="No workflow runs yet." />}>
          <RecordTable rows={runs.data ?? []} rowKey={(run) => run.id} label="Workflow runs" rowNumberStart={(runPage - 1) * 50 + 1} sorting={runSorting} showSortControls={false} columns={[
            { key: 'rule', label: 'Rule', minWidth: 220, render: (run) => `${run.definition.key} · Version ${run.definition.version}` },
            { key: 'status', label: 'Status', sortKey: 'status', render: (run) => formatRecordStatus(run.status) },
            { key: 'reason', label: 'Outcome', minWidth: 220, render: (run) => run.reason ? formatRecordStatus(run.reason) : 'Awaiting processing' },
            { key: 'created', label: 'Created', sortKey: 'createdAt', render: (run) => new Date(run.createdAt).toLocaleString() },
            { key: 'expires', label: 'Expires', sortKey: 'expiresAt', render: (run) => new Date(run.expiresAt).toLocaleString() },
            { key: 'actions', label: 'Actions', render: (run) => <AppButton size="small" variant="outlined" onClick={() => setSelectedRun(run)}>View run</AppButton> },
          ]} />
        </DataTableShell>
        <Stack direction="row" justifyContent="flex-end" spacing={1}><AppButton disabled={runPage === 1 || runs.isFetching} onClick={() => setRunPage((page) => page - 1)}>Previous runs</AppButton><AppButton disabled={runs.isFetching || runs.isError || (runs.data?.length ?? 0) < 50} onClick={() => setRunPage((page) => page + 1)}>More runs</AppButton></Stack>
      </Stack>
    </DetailSection>
    <AppDialog open={history !== null} title="Published version history" fullWidth maxWidth="md" showCloseButton onClose={() => setHistory(null)} actions={<AppButton onClick={() => setHistory(null)}>Close</AppButton>}>
      <Stack spacing={2}><TableSortControls {...versionSorting} />
        <DataTableShell wrapInTableContainer={false} isLoading={versions.isPending} isError={versions.isError} isEmpty={!versions.data?.length} loadingContent={<TableSkeleton rowCount={3} />} errorContent={<ErrorState message={toApiError(versions.error).message} onRetry={() => void versions.refetch()} />} emptyContent={<EmptyState title="No version history" description="Saved versions will appear here." />}>
          <RecordTable rows={versions.data ?? []} rowKey={(row) => row.id} label="Configuration versions" rowNumberStart={(historyPage - 1) * 50 + 1} sorting={versionSorting} showSortControls={false} columns={[
            { key: 'version', label: 'Version', sortKey: 'version', render: (row) => row.version },
            { key: 'published', label: 'Published', sortKey: 'publishedAt', render: (row) => new Date(row.publishedAt).toLocaleString() },
            { key: 'publisher', label: 'Published by', sortKey: 'publishedById', render: (row) => `User #${row.publishedById}` },
            { key: 'status', label: 'Status', render: (row) => row.definition.enabled ? 'Enabled' : 'Disabled' },
            { key: 'actions', label: 'Actions', minWidth: 220, render: (row) => <AppButton size="small" variant="outlined" disabled={rollback.isPending} onClick={() => { rollback.reset(); setRepublishVersion(row.version); }}>Republish version {row.version}</AppButton> },
          ]} />
        </DataTableShell>
        <Stack direction="row" justifyContent="flex-end"><AppButton disabled={historyPage === 1 || versions.isFetching} onClick={() => setHistoryPage((page) => page - 1)}>Previous versions</AppButton><AppButton disabled={versions.isFetching || versions.isError || (versions.data?.length ?? 0) < 50} onClick={() => setHistoryPage((page) => page + 1)}>More versions</AppButton></Stack>
      </Stack>
    </AppDialog>
    <ConfirmDialog open={republishVersion !== null} title="Use this historical configuration?" confirmLabel="Save as new version" isConfirming={rollback.isPending} onClose={() => { if (!rollback.isPending) setRepublishVersion(null); }} onConfirm={() => { if (republishVersion !== null) rollback.mutate(republishVersion); }}>Version {republishVersion} will become the settings for new activity. Existing records and saved versions will remain available.{rollback.isError ? <Alert severity="error">{toApiError(rollback.error).message}</Alert> : null}</ConfirmDialog>
    <AppDialog open={selectedRun !== null} title="Workflow run details" fullWidth maxWidth="md" showCloseButton onClose={() => setSelectedRun(null)} actions={<AppButton onClick={() => setSelectedRun(null)}>Close</AppButton>}>
      {selectedRun ? <Stack spacing={2}>
        <DetailSection title="Run summary"><DetailFields fields={[{ label: 'Rule', value: selectedRun.definition.key }, { label: 'Version', value: selectedRun.definition.version }, { label: 'Status', value: formatRecordStatus(selectedRun.status) }, { label: 'Requested by', value: `User #${selectedRun.actorId}` }, { label: 'Outcome', value: selectedRun.reason ? formatRecordStatus(selectedRun.reason) : 'Awaiting processing' }, { label: 'Source event', value: selectedRun.sourceEventId }, { label: 'Expires', value: new Date(selectedRun.expiresAt).toLocaleString() }]} /></DetailSection>
        <DetailSection title="Actions"><RecordTable rows={selectedRun.actions} rowKey={(row) => row.id} label="Run actions" columns={[{ key: 'step', label: 'Step', sortValue: (row) => row.step, render: (row) => row.step }, { key: 'outcome', label: 'Outcome', sortValue: (row) => row.outcome, render: (row) => formatRecordStatus(row.outcome) }]} /></DetailSection>
        <DetailSection title="Activity history"><RecordTable rows={selectedRun.logs ?? []} rowKey={(row) => row.id} label="Run activity" columns={[{ key: 'created', label: 'Date', sortValue: (row) => row.createdAt, render: (row) => new Date(row.createdAt).toLocaleString() }, { key: 'user', label: 'User', sortValue: (row) => row.userId, render: (row) => row.userId ? `User #${row.userId}` : 'System' }, { key: 'outcome', label: 'Outcome', render: (row) => `${formatRecordStatus(row.newValues?.reason ?? row.newValues?.status ?? 'RUN_UPDATED')}${row.newValues?.recipientId ? ` · Recipient #${row.newValues.recipientId}` : ''}` }]} /></DetailSection>
        {selectedRun.jobs.map((job) => <DetailSection key={job.id} title="Background processing"><DetailFields fields={[{ label: 'Task', value: formatRecordStatus(job.kind) }, { label: 'Status', value: formatRecordStatus(job.status) }, { label: 'Attempts', value: job.attempts }, { label: 'Available from', value: new Date(job.availableAt).toLocaleString() }]} /><RecordTable rows={job.jobAttempts} rowKey={(row) => row.id} label="Processing attempts" columns={[{ key: 'attempt', label: 'Attempt', sortValue: (row) => row.attempt, render: (row) => row.attempt }, { key: 'outcome', label: 'Outcome', render: (row) => formatRecordStatus(row.outcome ?? 'RUNNING') }, { key: 'error', label: 'Error reference', render: (row) => row.errorCode ?? 'None' }]} /></DetailSection>)}
        <Stack direction="row" spacing={1}><AppButton color="error" variant="outlined" disabled={control.isPending || selectedRun.status === 'CANCELLED'} onClick={() => { control.reset(); setRunCommand({ id: selectedRun.id, command: 'CANCEL' }); }}>Cancel remaining actions</AppButton><AppButton disabled={control.isPending || !selectedRun.jobs.some((job) => job.status === 'DEAD') || selectedRun.status === 'CANCELLED'} onClick={() => { control.reset(); setRunCommand({ id: selectedRun.id, command: 'RETRY' }); }}>Retry failed actions</AppButton></Stack>
      </Stack> : null}
    </AppDialog>
    <ConfirmDialog open={runCommand !== null} title={runCommand?.command === 'CANCEL' ? 'Cancel remaining workflow actions?' : 'Retry failed workflow actions?'} confirmLabel={runCommand?.command === 'CANCEL' ? 'Cancel remaining actions' : 'Retry failed actions'} confirmColor={runCommand?.command === 'CANCEL' ? 'error' : 'primary'} isConfirming={control.isPending} onClose={() => { if (!control.isPending) setRunCommand(null); }} onConfirm={() => { if (runCommand) control.mutate(runCommand); }}>Completed actions remain in the activity history.{control.isError ? <Alert severity="error">{toApiError(control.error).message}</Alert> : null}</ConfirmDialog>
  </PageContainer>;
}
function PreviewResult({ value }: { value: unknown }) {
  const result = value as { steps?: Array<{ id: string; type: string }>; heading?: string; footer?: string; valid?: boolean };
  return <Alert severity="success"><Stack><Typography>Preview completed without side effects.</Typography>{result.steps ? <Typography>{result.steps.map((step) => step.type.toLowerCase()).join(' → ') || 'The rule does not match this example event.'}</Typography> : null}{result.heading !== undefined ? <Typography sx={{ whiteSpace: 'pre-wrap' }}>{result.heading}</Typography> : null}{result.footer !== undefined ? <Typography sx={{ whiteSpace: 'pre-wrap' }}>{result.footer}</Typography> : null}</Stack></Alert>;
}
