import { Alert, Checkbox, FormControlLabel, Stack, TextField, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { PERMISSIONS, useAuth, useHasPermission } from '@features/auth';
import { toApiError } from '@shared/api/apiClient';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { AppButton } from '@shared/ui/actions';
import { PageContainer, PageHeader } from '@shared/ui/layout';
import { connectionKeys, createEndpoint, issueKey, listDeliveries, listEndpoints, listKeys, listProviderStatus, revokeKey, rotateEndpoint, toggleEndpoint, type ApiKey, type KeyInput } from './connections.api';

export function ConnectionsPage() {
  const firmId = useFirmId(); const { user } = useAuth();
  const canKeys = useHasPermission(PERMISSIONS.API_KEYS_MANAGE); const canHooks = useHasPermission(PERMISSIONS.WEBHOOKS_MANAGE);
  const canProviders = useHasPermission(PERMISSIONS.FIRM_PROFILE_MANAGE);
  return <PageContainer key={`${firmId}:${user?.id}`}><PageHeader title="API and webhooks" description="Your credentials and delivery configuration for the selected firm" />{canProviders ? <ProvidersPanel /> : null}{canKeys ? <KeysPanel /> : null}{canHooks ? <WebhooksPanel /> : null}</PageContainer>;
}

function ProvidersPanel() {
  const firmId = useFirmId(); const { user } = useAuth();
  const status = useQuery({ queryKey: [...connectionKeys(firmId, user?.id), 'providers'], queryFn: ({ signal }) => listProviderStatus(signal), enabled: firmId != null, retry: false });
  return <Stack spacing={2}><Typography component="h2" variant="h2">Provider readiness</Typography>{status.error ? <Alert severity="error">{toApiError(status.error).message}</Alert> : null}{status.data?.providers.map((provider) => <Alert key={provider.provider} severity={provider.enabled ? 'info' : 'warning'}><strong>{provider.provider} · {provider.capability} · {provider.state}</strong><Typography>{provider.reason}</Typography></Alert>)}</Stack>;
}

function KeysPanel() {
  const firmId = useFirmId(); const { user } = useAuth(); const cache = useQueryClient(); const scope = connectionKeys(firmId, user?.id);
  const [page, setPage] = useState(1); const [name, setName] = useState(''); const [days, setDays] = useState(30); const [exporting, setExporting] = useState(false); const [secret, setSecret] = useState('');
  const keys = useQuery({ queryKey: [...scope, 'keys', page], queryFn: ({ signal }) => listKeys(page, signal), enabled: firmId != null, retry: false });
  const issue = useMutation({ mutationFn: async (existing?: ApiKey) => {
    const result = await issueKey(existing ? { name: existing.name, lifetimeDays: days, scopes: existing.scopes as KeyInput['scopes'] } : { name, lifetimeDays: days, scopes: exporting ? ['reports.read', 'reports.export'] : ['reports.read'] }, existing?.id);
    setSecret(result.token); return result.key;
  }, onSuccess: () => cache.invalidateQueries({ queryKey: [...scope, 'keys'] }) });
  const revoke = useMutation({ mutationFn: revokeKey, onSuccess: () => cache.invalidateQueries({ queryKey: [...scope, 'keys'] }) });
  const busy = issue.isPending || revoke.isPending;
  return <Stack spacing={2}>
    <Typography component="h2" variant="h2">Read-only API credentials</Typography>
    <Typography>API base: /api/v1/external/v1. Send Authorization: Bearer followed by your token. The key fixes the firm; tenant headers cannot change it. Current issuer permissions, plan access, expiration and revocation are checked on every request.</Typography>
    <Stack component="form" spacing={2} onSubmit={(event) => { event.preventDefault(); issue.mutate(undefined); }}><TextField label="API key name" value={name} onChange={(event) => setName(event.target.value)} inputProps={{ maxLength: 100 }} required disabled={busy} /><TextField label="Key lifetime in days" type="number" value={days} onChange={(event) => setDays(Number(event.target.value))} inputProps={{ min: 1, max: 365 }} required disabled={busy} /><FormControlLabel label="Allow report exports" control={<Checkbox checked={exporting} onChange={(_, checked) => setExporting(checked)} disabled={busy} />} /><AppButton type="submit" disabled={busy || !name.trim() || days < 1 || days > 365 || !Number.isInteger(days)}>Create API key</AppButton></Stack>
    {secret ? <><Alert severity="info">Store the new token securely now. Rotation revokes the previous token immediately.</Alert><TextField label="New API token shown once" value={secret} InputProps={{ readOnly: true }} /><AppButton onClick={() => { setSecret(''); issue.reset(); }}>Dismiss token</AppButton></> : null}
    {[keys.error, issue.error, revoke.error].filter(Boolean).map((error, index) => <Alert severity="error" key={index}>{toApiError(error).message}</Alert>)}
    {keys.data?.keys.map((key) => <Stack key={key.id} spacing={1}><Typography>{key.name} · {key.scopes.join(', ')} · Expires {key.expiresAt} · {key.revokedAt ? 'Revoked' : 'Active until expiry'}</Typography>{!key.revokedAt ? <Stack direction="row" spacing={1}><AppButton variant="outlined" disabled={busy || days < 1 || days > 365 || !Number.isInteger(days)} onClick={() => issue.mutate(key)}>Rotate {key.name}</AppButton><AppButton variant="outlined" color="error" disabled={busy} onClick={() => revoke.mutate(key.id)}>Revoke {key.name}</AppButton></Stack> : null}</Stack>)}
    {keys.data && keys.data.pagination.totalPages > 1 ? <Stack direction="row" spacing={1}><AppButton disabled={busy || page === 1} onClick={() => setPage(page - 1)}>Previous keys</AppButton><AppButton disabled={busy || page >= keys.data.pagination.totalPages} onClick={() => setPage(page + 1)}>Next keys</AppButton></Stack> : null}
  </Stack>;
}

function WebhooksPanel() {
  const firmId = useFirmId(); const { user } = useAuth(); const cache = useQueryClient(); const scope = connectionKeys(firmId, user?.id);
  const [name, setName] = useState(''); const [url, setUrl] = useState(''); const [secret, setSecret] = useState(''); const [selected, setSelected] = useState<string>(); const [page, setPage] = useState(1);
  const endpoints = useQuery({ queryKey: [...scope, 'webhooks'], queryFn: ({ signal }) => listEndpoints(signal), enabled: firmId != null, retry: false });
  const deliveries = useQuery({ queryKey: [...scope, 'deliveries', selected, page], queryFn: ({ signal }) => listDeliveries(selected!, page, signal), enabled: firmId != null && Boolean(selected), retry: false });
  const refresh = () => cache.invalidateQueries({ queryKey: [...scope, 'webhooks'] });
  const create = useMutation({ mutationFn: async () => { const result = await createEndpoint(name, url); setSecret(result.secret); return result.endpoint; }, onSuccess: refresh });
  const toggle = useMutation({ mutationFn: toggleEndpoint, onSuccess: refresh });
  const rotate = useMutation({ mutationFn: async (id: string) => { const result = await rotateEndpoint(id); setSecret(result.secret); return result.endpoint; }, onSuccess: refresh });
  const busy = create.isPending || toggle.isPending || rotate.isPending;
  const configured = endpoints.data?.configuration; const ready = configured?.encryptionConfigured && configured.destinationsConfigured && configured.workerEnabled;
  return <Stack spacing={2}>
    <Typography component="h2" variant="h2">Signed report export webhooks</Typography>
    <Typography>At-least-once delivery, five automatic attempts. Verify the signature and timestamp before parsing, then durably deduplicate the delivery ID. Exports send metadata only. Secret rotation preserves the signing version of pending deliveries.</Typography>
    {configured ? <Alert severity={ready ? 'info' : 'warning'}>Encryption {configured.encryptionConfigured ? 'configured' : 'missing'} · Destination allowlist {configured.destinationsConfigured ? 'configured' : 'missing'} · Worker {configured.workerEnabled ? 'enabled' : 'disabled'}</Alert> : null}
    <Stack component="form" spacing={2} onSubmit={(event) => { event.preventDefault(); create.mutate(); }}><TextField label="Webhook name" value={name} onChange={(event) => setName(event.target.value)} required disabled={busy} inputProps={{ maxLength: 100 }} /><TextField label="Webhook HTTPS URL" type="url" value={url} onChange={(event) => setUrl(event.target.value)} required disabled={busy} inputProps={{ maxLength: 1000 }} helperText="An operator must approve the exact destination hostname. New endpoints start disabled." /><AppButton type="submit" disabled={busy || !name.trim() || !url || !configured?.encryptionConfigured || !configured.destinationsConfigured}>Create disabled endpoint</AppButton></Stack>
    {secret ? <><TextField label="Webhook signing secret shown once" value={secret} InputProps={{ readOnly: true }} /><AppButton onClick={() => { setSecret(''); create.reset(); rotate.reset(); }}>Dismiss signing secret</AppButton></> : null}
    {[endpoints.error, deliveries.error, create.error, toggle.error, rotate.error].filter(Boolean).map((error, index) => <Alert severity="error" key={index}>{toApiError(error).message}</Alert>)}
    {endpoints.data?.endpoints.map((endpoint) => <Stack key={endpoint.id} spacing={1}><Typography>{endpoint.name} · {endpoint.url} · {endpoint.enabled ? 'Enabled' : 'Disabled'} · Signing version {endpoint.secretVersion}</Typography><Stack direction="row" useFlexGap flexWrap="wrap" gap={1}><AppButton disabled={busy || (!endpoint.enabled && !ready)} onClick={() => toggle.mutate(endpoint)}>{endpoint.enabled ? 'Disable' : 'Enable'} {endpoint.name}</AppButton><AppButton disabled={busy} variant="outlined" onClick={() => rotate.mutate(endpoint.id)}>Rotate signing secret</AppButton><AppButton variant="outlined" onClick={() => { setSelected(endpoint.id); setPage(1); }}>View deliveries for {endpoint.name}</AppButton></Stack></Stack>)}
    {selected ? <Stack spacing={1}><Typography component="h3" variant="h3">Delivery history</Typography><AppButton disabled={deliveries.isFetching} onClick={() => void deliveries.refetch()}>Refresh deliveries</AppButton>{deliveries.data?.deliveries.length === 0 ? <Typography>No deliveries recorded.</Typography> : null}{deliveries.data?.deliveries.map((delivery) => <Stack key={delivery.id}><Typography>{delivery.id} · {delivery.event.status} · Attempts {delivery.event.attempts}/{delivery.event.maxAttempts} · Signing version {delivery.secretVersion}</Typography>{delivery.event.jobAttempts.map((attempt) => <Typography key={attempt.attempt} variant="caption">Attempt {attempt.attempt}: {attempt.outcome ?? 'Processing'} {attempt.errorCode ?? ''}</Typography>)}</Stack>)}{deliveries.data && deliveries.data.pagination.totalPages > 1 ? <Stack direction="row" spacing={1}><AppButton disabled={page === 1} onClick={() => setPage(page - 1)}>Previous deliveries</AppButton><AppButton disabled={page >= deliveries.data.pagination.totalPages} onClick={() => setPage(page + 1)}>Next deliveries</AppButton></Stack> : null}</Stack> : null}
  </Stack>;
}
