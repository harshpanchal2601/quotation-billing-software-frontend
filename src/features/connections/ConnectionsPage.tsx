import { Alert, Checkbox, FormControlLabel, Stack, TextField, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { PERMISSIONS, useAuth, useHasPermission } from '@features/auth';
import { toApiError } from '@shared/api/apiClient';
import { CommandForm } from '@shared/forms/CommandForm';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { AppButton } from '@shared/ui/actions';
import { ConfirmDialog } from '@shared/ui/dialogs';
import { useNotification } from '@shared/ui/feedback';
import { formatRecordStatus } from '@shared/ui/display';
import { PageContainer, PageHeader, WorkspaceTabs } from '@shared/ui/layout';
import { RecordPagination, RecordTable, useTableSort } from '@shared/ui/tables';
import { connectionKeys, createEndpoint, issueKey, listDeliveries, listEndpoints, listKeys, listProviderStatus, revokeKey, rotateEndpoint, toggleEndpoint, type ApiKey, type Endpoint } from './connections.api';

export function ConnectionsPage() {
  const firmId = useFirmId(); const { user } = useAuth();
  return <ConnectionsWorkspace key={`${firmId}:${user?.id}`} />;
}
function ConnectionsWorkspace() {
  const canKeys = useHasPermission(PERMISSIONS.API_KEYS_MANAGE); const canHooks = useHasPermission(PERMISSIONS.WEBHOOKS_MANAGE); const canProviders = useHasPermission(PERMISSIONS.FIRM_PROFILE_MANAGE);
  const tabs = [...(canKeys ? [{ value: 'keys', label: 'API keys' }] : []), ...(canHooks ? [{ value: 'webhooks', label: 'Webhooks' }] : []), ...(canProviders ? [{ value: 'providers', label: 'Provider readiness' }] : [])];
  const [tab, setTab] = useState(tabs[0]?.value ?? 'providers');
  const selected = tabs.some((item) => item.value === tab) ? tab : tabs[0]?.value;
  return <PageContainer><PageHeader title="API and webhooks" description="Review service availability and manage approved connections to other software." />
    <WorkspaceTabs value={selected ?? ''} label="Integration settings" items={tabs} onChange={setTab} />
    {selected === 'keys' ? <KeysPanel /> : selected === 'webhooks' ? <WebhooksPanel /> : selected === 'providers' ? <ProvidersPanel /> : null}
  </PageContainer>;
}
const providerNames = new Map([['SMTP', 'Email server (SMTP)'], ['RAZORPAY', 'Razorpay'], ['INDIA_IRP', 'India e-invoice service']]);
function ProvidersPanel() {
  const firmId = useFirmId(); const { user } = useAuth();
  const query = useQuery({ queryKey: [...connectionKeys(firmId, user?.id), 'providers'], queryFn: ({ signal }) => listProviderStatus(signal), enabled: firmId != null, retry: false });
  return <Stack spacing={2}><Typography component="h2" variant="h2">Provider readiness</Typography>
    {query.isPending ? <Typography role="status">Loading providers…</Typography> : null}
    {query.isError ? <Alert severity="error" action={<AppButton onClick={() => void query.refetch()}>Retry providers</AppButton>}>{toApiError(query.error).message}</Alert> : null}
    {query.data ? <RecordTable rows={query.data.providers} label="Provider readiness" rowKey={(row) => `${row.provider}:${row.capability}`} columns={[
      { key: 'provider', label: 'Provider', sortValue: (row) => providerNames.get(row.provider) ?? row.provider, render: (row) => providerNames.get(row.provider) ?? row.provider }, { key: 'capability', label: 'Capability', sortValue: (row) => row.capability, render: (row) => row.capability },
      { key: 'state', label: 'Status', sortValue: (row) => formatRecordStatus(row.state), render: (row) => formatRecordStatus(row.state) }, { key: 'enabled', label: 'Enabled', sortValue: (row) => row.enabled, render: (row) => row.enabled ? 'Yes' : 'No' }, { key: 'reason', label: 'Readiness details', render: (row) => row.reason },
    ]} /> : null}
  </Stack>;
}
function KeysPanel() {
  const firmId = useFirmId(); const { user } = useAuth(); const cache = useQueryClient(); const notify = useNotification(); const scope = connectionKeys(firmId, user?.id);
  const [page, setPage] = useState(1); const [secret, setSecret] = useState(''); const [revoking, setRevoking] = useState<ApiKey | null>(null);
  const sorting = useTableSort([{ key: 'createdAt', label: 'Created date' }, { key: 'name', label: 'Key name' }, { key: 'expiresAt', label: 'Expiry date' }], { onChange: () => setPage(1) });
  const keys = useQuery({ queryKey: [...scope, 'keys', page, sorting.sortBy, sorting.sortOrder], queryFn: ({ signal }) => listKeys(page, signal, { sortBy: sorting.sortBy, sortOrder: sorting.sortOrder }), enabled: firmId != null, retry: false });
  const refresh = () => cache.invalidateQueries({ queryKey: [...scope, 'keys'] });
  const revoke = useMutation({ mutationFn: revokeKey, onSuccess: async () => { setRevoking(null); notify('API key revoked.'); try { await refresh(); } catch { notify('The key was revoked, but records could not refresh.', 'warning'); } }, onError: (error) => notify(toApiError(error).message, 'error') });
  const issue = async (data: FormData, existing?: ApiKey) => { const result = await issueKey({ name: existing?.name ?? String(data.get('name')).trim(), lifetimeDays: Number(data.get('days')), scopes: existing ? existing.scopes as Array<'reports.read' | 'reports.export'> : data.get('exports') === 'on' ? ['reports.read', 'reports.export'] : ['reports.read'] }, existing?.id); setSecret(result.token); };
  const lifetime = <TextField name="days" label="Key lifetime in days" type="number" defaultValue={30} inputProps={{ min: 1, max: 365, step: 1 }} required />;
  return <Stack spacing={2}>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between"><Typography component="h2" variant="h2">Read-only API credentials</Typography>
      <CommandForm dialog title="Create API key" label="Create API key" successMessage="API key created. Store the token shown below." saved={refresh} submit={(data) => issue(data)}><TextField name="name" label="API key name" inputProps={{ maxLength: 100 }} required />{lifetime}<FormControlLabel label="Allow report exports" control={<Checkbox name="exports" />} /></CommandForm>
    </Stack>
    <Typography>Use the external reporting API with your bearer token. Each key belongs to this firm and its issuer. Permissions, plan access, expiration and revocation are checked on every request.</Typography>
    {secret ? <><Alert severity="info">Store the new token securely now. Rotation revokes the previous token immediately.</Alert><TextField label="New API token shown once" value={secret} InputProps={{ readOnly: true }} autoComplete="off" /><AppButton onClick={() => setSecret('')}>Dismiss token</AppButton></> : null}
    {keys.isPending ? <Typography role="status">Loading API keys…</Typography> : null}
    {keys.isError ? <Alert severity="error" action={<AppButton onClick={() => void keys.refetch()}>Retry API keys</AppButton>}>{toApiError(keys.error).message}</Alert> : null}
    {keys.data ? <><RecordTable rows={keys.data.keys} sorting={sorting} rowNumberStart={(page - 1) * 20 + 1} label="API credentials" rowKey={(row) => row.id} emptyMessage="No API keys yet. Create a key for an approved reporting client." columns={[
      { key: 'name', sortKey: 'name', label: 'Key name', render: (row) => row.name }, { key: 'scopes', label: 'Scopes', render: (row) => row.scopes.join(', ') },
      { key: 'expiresAt', sortKey: 'expiresAt', label: 'Expires', render: (row) => new Date(row.expiresAt).toLocaleString() }, { key: 'status', label: 'Status', render: (row) => row.revokedAt ? 'Revoked' : new Date(row.expiresAt).getTime() <= Date.now() ? 'Expired' : 'Active' },
      { key: 'actions', label: 'Actions', render: (row) => !row.revokedAt ? <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}><CommandForm dialog title={`Rotate ${row.name}`} label="Rotate key" confirmation={{ title: `Rotate ${row.name}?`, description: 'The old token stops working immediately. Update the approved client with the new token.', color: 'warning' }} successMessage="API key rotated. Store the new token." saved={refresh} submit={(data) => issue(data, row)}>{lifetime}</CommandForm><AppButton color="error" disabled={revoke.isPending} onClick={() => setRevoking(row)}>Revoke {row.name}</AppButton></Stack> : '—' },
    ]} /><RecordPagination pagination={keys.data.pagination} page={page} change={setPage} /></> : null}
    <ConfirmDialog open={revoking !== null} title={`Revoke ${revoking?.name ?? 'API key'}?`} confirmLabel="Revoke key" confirmColor="error" isConfirming={revoke.isPending} onClose={() => setRevoking(null)} onConfirm={() => { if (revoking) revoke.mutate(revoking.id); }}>This token will stop working immediately. Requests from clients using it will be rejected.</ConfirmDialog>
  </Stack>;
}
function WebhooksPanel() {
  const firmId = useFirmId(); const { user } = useAuth(); const cache = useQueryClient(); const notify = useNotification(); const scope = connectionKeys(firmId, user?.id);
  const [secret, setSecret] = useState(''); const [selected, setSelected] = useState<string>(); const [page, setPage] = useState(1); const [toggling, setToggling] = useState<Endpoint | null>(null);
  const sorting = useTableSort([{ key: 'createdAt', label: 'Delivery date' }, { key: 'secretVersion', label: 'Signing version' }], { onChange: () => setPage(1) });
  const endpoints = useQuery({ queryKey: [...scope, 'webhooks'], queryFn: ({ signal }) => listEndpoints(signal), enabled: firmId != null, retry: false });
  const deliveries = useQuery({ queryKey: [...scope, 'deliveries', selected, page, sorting.sortBy, sorting.sortOrder], queryFn: ({ signal }) => listDeliveries(selected!, page, signal, { sortBy: sorting.sortBy, sortOrder: sorting.sortOrder }), enabled: firmId != null && Boolean(selected), retry: false });
  const refresh = () => cache.invalidateQueries({ queryKey: [...scope, 'webhooks'] });
  const toggle = useMutation({ mutationFn: toggleEndpoint, onSuccess: async () => { setToggling(null); notify('Webhook endpoint updated.'); try { await refresh(); } catch { notify('The endpoint was updated, but records could not refresh.', 'warning'); } }, onError: (error) => notify(toApiError(error).message, 'error') });
  const configured = endpoints.data?.configuration; const ready = configured?.encryptionConfigured && configured.destinationsConfigured && configured.workerEnabled;
  return <Stack spacing={2}>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between"><Typography component="h2" variant="h2">Signed report export webhooks</Typography>
      <CommandForm dialog title="Create webhook endpoint" label="Create disabled endpoint" isSubmitDisabled={!configured?.encryptionConfigured || !configured.destinationsConfigured} successMessage="Disabled endpoint created. Store the signing secret." saved={refresh} submit={async (data) => { const result = await createEndpoint(String(data.get('name')).trim(), String(data.get('url')).trim()); setSecret(result.secret); }}>
        {!configured ? <Alert severity="info">Webhook configuration could not be checked. Close this form and load the endpoint settings before creating an endpoint.</Alert> : !configured.encryptionConfigured || !configured.destinationsConfigured ? <Alert severity="warning">Webhook setup is unavailable. Ask your server administrator to configure {(!configured.encryptionConfigured && !configured.destinationsConfigured) ? 'secret encryption and the approved destination list' : !configured.encryptionConfigured ? 'secret encryption' : 'the approved destination list'}, then reload these settings.</Alert> : null}
        <TextField name="name" label="Webhook name" required inputProps={{ maxLength: 100 }} /><TextField name="url" label="Webhook HTTPS URL" type="url" required inputProps={{ maxLength: 1000 }} helperText="An operator must approve the exact destination hostname. New endpoints start disabled." />
      </CommandForm>
    </Stack>
    <Typography>Export events contain metadata. Deliveries may repeat: receivers must verify signatures and timestamps, then deduplicate delivery IDs. Failed deliveries receive up to five automatic attempts.</Typography>
    {configured ? <Alert severity={ready ? 'info' : 'warning'}>Encryption {configured.encryptionConfigured ? 'configured' : 'missing'} · Destination allowlist {configured.destinationsConfigured ? 'configured' : 'missing'} · Worker {configured.workerEnabled ? 'enabled' : 'disabled'}</Alert> : null}
    {secret ? <><TextField label="Webhook signing secret shown once" value={secret} InputProps={{ readOnly: true }} autoComplete="off" /><AppButton onClick={() => setSecret('')}>Dismiss signing secret</AppButton></> : null}
    {endpoints.isPending ? <Typography role="status">Loading webhook endpoints…</Typography> : null}
    {endpoints.isError ? <Alert severity="error" action={<AppButton onClick={() => void endpoints.refetch()}>Retry endpoints</AppButton>}>{toApiError(endpoints.error).message}</Alert> : null}
    {endpoints.data ? <RecordTable rows={endpoints.data.endpoints} label="Webhook endpoints" rowKey={(row) => row.id} emptyMessage="No webhook endpoints configured." columns={[
      { key: 'name', label: 'Name', sortValue: (row) => row.name, render: (row) => row.name }, { key: 'url', label: 'Destination', sortValue: (row) => row.url, render: (row) => row.url },
      { key: 'enabled', label: 'Status', sortValue: (row) => row.enabled, render: (row) => row.enabled ? 'Enabled' : 'Disabled' }, { key: 'version', label: 'Signing version', align: 'right', sortValue: (row) => row.secretVersion, render: (row) => row.secretVersion },
      { key: 'actions', label: 'Actions', render: (row) => <Stack spacing={1}><AppButton disabled={toggle.isPending || (!row.enabled && !ready)} onClick={() => setToggling(row)}>{row.enabled ? 'Disable' : 'Enable'} {row.name}</AppButton><CommandForm dialog title={`Rotate signing secret for ${row.name}`} label="Rotate signing secret" confirmation={{ title: `Rotate ${row.name} signing secret?`, description: 'New deliveries use the new version. Pending deliveries retain their signing version. Update the receiver before accepting the new version.', color: 'warning' }} saved={refresh} successMessage="Signing secret rotated." submit={async () => { const result = await rotateEndpoint(row.id); setSecret(result.secret); }}><Typography>The new secret is shown once after rotation.</Typography></CommandForm><AppButton onClick={() => { setSelected(row.id); setPage(1); }}>View deliveries for {row.name}</AppButton></Stack> },
    ]} /> : null}
    {selected ? <Stack spacing={2}><Typography component="h3" variant="h3">Delivery history</Typography><AppButton disabled={deliveries.isFetching} onClick={() => void deliveries.refetch()}>Refresh deliveries</AppButton>
      {deliveries.isError ? <Alert severity="error">{toApiError(deliveries.error).message}</Alert> : null}{deliveries.isPending ? <Typography role="status">Loading deliveries…</Typography> : null}
      {deliveries.data ? <><RecordTable rows={deliveries.data.deliveries} sorting={sorting} rowNumberStart={(page - 1) * 20 + 1} label="Webhook deliveries" rowKey={(row) => row.id} emptyMessage="No deliveries recorded." columns={[
        { key: 'id', label: 'Delivery', render: (row) => row.id }, { key: 'status', label: 'Status', render: (row) => formatRecordStatus(row.event.status) }, { key: 'attempts', label: 'Attempts', align: 'right', render: (row) => `${row.event.attempts}/${row.event.maxAttempts}` },
        { key: 'version', sortKey: 'secretVersion', label: 'Signing version', align: 'right', render: (row) => row.secretVersion }, { key: 'outcomes', label: 'Attempt outcomes', render: (row) => row.event.jobAttempts.map((attempt) => `Attempt ${attempt.attempt}: ${attempt.outcome ? formatRecordStatus(attempt.outcome) : 'Processing'} ${attempt.errorCode ?? ''}`).join('; ') || 'No attempts yet' },
      ]} /><RecordPagination pagination={deliveries.data.pagination} page={page} change={setPage} /></> : null}
    </Stack> : null}
    <ConfirmDialog open={toggling !== null} title={`${toggling?.enabled ? 'Disable' : 'Enable'} ${toggling?.name ?? 'endpoint'}?`} confirmLabel={toggling?.enabled ? 'Disable endpoint' : 'Enable endpoint'} isConfirming={toggle.isPending} onClose={() => setToggling(null)} onConfirm={() => { if (toggling) toggle.mutate(toggling); }}>{toggling?.enabled ? 'Future events will no longer be queued to this endpoint. Existing delivery history is retained.' : 'Future report export events will be sent to this approved destination using signed requests.'}</ConfirmDialog>
  </Stack>;
}
