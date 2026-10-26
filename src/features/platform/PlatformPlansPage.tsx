import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { toApiError } from '@shared/api/apiClient';
import { ErrorState } from '@shared/components/common/ErrorState';
import { AppButton } from '@shared/ui/actions';
import { PageContainer, PageHeader } from '@shared/ui/layout';
import { subscriptionsApi as api } from './subscriptions.api';
import type { PlanVersion, PlanVersionInput, SubscriptionPolicy } from './subscriptions.types';
import { usePlatformOperation } from './usePlatformOperation';
import { PlatformAuditPanel } from './PlatformAuditPanel';

type PolicyForm = Record<keyof SubscriptionPolicy, string>;
const emptyPolicy: PolicyForm = { trialDays: '', graceDays: '', billingCycle: '', cancellationAccess: '', downgradeTiming: '', retention: '', overridePrecedence: '' };
const emptyDraft: PlanVersionInput = { features: ['firm.core'], quotas: { users: '', documents: null, storageBytes: null, aiCredits: '0' }, policy: null, price: null, currency: null, reason: '' };

export function PlatformPlansPage() {
  const [page, setPage] = useState(1);
  const [planId, setPlanId] = useState<number | null>(null);
  const [versionId, setVersionId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [rename, setRename] = useState('');
  const [reason, setReason] = useState('');
  const [draft, setDraft] = useState<PlanVersionInput>(emptyDraft);
  const [policy, setPolicy] = useState<PolicyForm>(emptyPolicy);
  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState<{ errors: string[]; previewToken: string } | null>(null);
  const operation = usePlatformOperation();
  const plans = useQuery({ queryKey: ['platform', 'plans', page], queryFn: ({ signal }) => api.plans(page, signal) });
  const features = useQuery({ queryKey: ['platform', 'features'], queryFn: ({ signal }) => api.features(signal) });
  const detail = useQuery({ queryKey: ['platform', 'plan', planId], queryFn: ({ signal }) => api.plan(planId!, signal), enabled: planId !== null });
  const selectedVersion = detail.data?.versions.find((version) => version.id === versionId);
  const immutable = detail.data?.isLegacy === true || selectedVersion?.publishedAt !== null && selectedVersion !== undefined;
  const allowedAction = reason.trim().length >= 10 && !operation.isPending;

  function chooseVersion(version?: PlanVersion) {
    setVersionId(version?.id ?? null);
    setDraft(version ? {
      features: version.features.map((feature) => feature.featureKey),
      quotas: { users: version.quotas.find((quota) => quota.resource === 'users')?.limit ?? '', documents: version.quotas.find((quota) => quota.resource === 'documents')?.limit ?? null, storageBytes: version.quotas.find((quota) => quota.resource === 'storageBytes')?.limit ?? null, aiCredits: version.quotas.find((quota) => quota.resource === 'aiCredits')?.limit ?? null },
      policy: version.policy, price: version.price, currency: version.currency, reason: '',
    } : { ...emptyDraft, features: [...emptyDraft.features], quotas: { ...emptyDraft.quotas } });
    setPolicy(version?.policy ? Object.fromEntries(Object.entries(version.policy).map(([key, value]) => [key, String(value)])) as PolicyForm : { ...emptyPolicy });
    setEditing(true); setDirty(version === undefined); setPreview(null);
  }

  function changeDraft(update: Partial<PlanVersionInput>) {
    setDraft((current) => ({ ...current, ...update })); setDirty(true); setPreview(null);
  }

  function policyValue(): SubscriptionPolicy | null {
    if (Object.values(policy).some((value) => value === '')) return null;
    return { ...policy, trialDays: Number(policy.trialDays), graceDays: Number(policy.graceDays) } as SubscriptionPolicy;
  }

  return <PageContainer><PageHeader title="Plans & Features" description="Create plan revisions, preview access, approve lifecycle policies and publish immutable snapshots." />
    <Stack spacing={3}>
      {operation.isError ? <ErrorState message={toApiError(operation.error).message} /> : null}
      {operation.isSuccess ? <Alert severity="success">Platform change saved.</Alert> : null}
      <TextField label="Reason for platform change" required value={reason} onChange={(event) => setReason(event.target.value)} helperText="At least 10 characters. Recorded with your identity in platform audit history." />
      <Stack spacing={2}>
        <Typography variant="h6">Create plan</Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField label="Plan name" value={name} onChange={(event) => setName(event.target.value)} />
          <TextField label="Plan slug" value={slug} onChange={(event) => setSlug(event.target.value)} />
          <AppButton disabled={!allowedAction || name.trim().length < 2 || slug.length < 2} onClick={() => operation.mutate(async () => { const plan = await api.createPlan({ name, slug, reason }); setPlanId(plan.id); setRename(plan.name); setEditing(false); setName(''); setSlug(''); })}>Create draft plan</AppButton>
        </Stack>
      </Stack>
      {plans.isError ? <ErrorState message="Plans could not be loaded." onRetry={() => { void plans.refetch(); }} /> : null}
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {plans.data?.plans.map((plan) => <AppButton key={plan.id} disabled={operation.isPending} variant={plan.id === planId ? 'contained' : 'outlined'} onClick={() => { setPlanId(plan.id); setRename(plan.name); setEditing(false); setPreview(null); }}>{plan.name}{plan.archivedAt ? ' (archived)' : ''}</AppButton>)}
      </Stack>
      <Stack direction="row" spacing={2}><AppButton disabled={page === 1} onClick={() => setPage(page - 1)}>Previous plans</AppButton><Typography>Page {page}</Typography><AppButton disabled={page * 50 >= (plans.data?.total ?? 0)} onClick={() => setPage(page + 1)}>Next plans</AppButton></Stack>
      {detail.isError ? <ErrorState message="Plan revisions could not be loaded." onRetry={() => { void detail.refetch(); }} /> : null}
      {detail.data ? <Stack spacing={2}>
        <Typography variant="h6">{detail.data.name} revisions</Typography>
        {detail.data.isLegacy ? <Alert severity="info">Legacy revisions preserve existing access and user limits. They are reserved and immutable.</Alert> : <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField label="Plan display name" value={rename} onChange={(event) => setRename(event.target.value)} />
          <AppButton disabled={!allowedAction || rename.trim().length < 2} onClick={() => operation.mutate(() => api.updatePlan(planId!, { name: rename, archived: detail.data!.archivedAt !== null, reason }))}>Rename plan</AppButton>
          <AppButton disabled={!allowedAction} onClick={() => operation.mutate(() => api.updatePlan(planId!, { name: detail.data!.name, archived: detail.data!.archivedAt === null, reason }))}>{detail.data.archivedAt ? 'Restore plan' : 'Archive plan'}</AppButton>
          <AppButton disabled={operation.isPending || detail.data.archivedAt !== null} onClick={() => chooseVersion()}>New revision</AppButton>
        </Stack>}
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>{detail.data.versions.map((version) => <AppButton key={version.id} disabled={operation.isPending} onClick={() => chooseVersion(version)}>Revision {version.revision} · {version.publishedAt ? 'Published' : 'Draft'}</AppButton>)}</Stack>
      </Stack> : null}
      {editing && detail.data ? <Stack spacing={2}>
        <Typography variant="h6">{versionId === null ? 'New revision' : `Revision ${selectedVersion?.revision ?? ''}`}</Typography>
        {immutable ? <Alert severity="info">Published snapshots cannot be edited. Create a new revision to change future assignments.</Alert> : null}
        <Box component="fieldset" disabled={immutable || operation.isPending} sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}>
          <Stack spacing={2}>
            <Typography variant="subtitle1">Included features</Typography>
            {features.data?.features.map((feature) => <FormControlLabel key={feature.key} control={<Checkbox checked={draft.features.includes(feature.key)} disabled={feature.required} onChange={(_event, checked) => changeDraft({ features: checked ? [...draft.features, feature.key] : draft.features.filter((key) => key !== feature.key) })} />} label={`${feature.description}${feature.dependencies.length ? ` · requires ${feature.dependencies.join(', ')}` : ''}${feature.required ? ' · required' : ''}`} />)}
            <Typography variant="subtitle1">Quotas · blank means unlimited except users</Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>{(Object.keys(draft.quotas) as Array<keyof PlanVersionInput['quotas']>).map((resource) => <TextField key={resource} label={resource === 'storageBytes' ? 'Storage bytes' : resource} value={draft.quotas[resource] ?? ''} required={resource === 'users'} onChange={(event) => changeDraft({ quotas: { ...draft.quotas, [resource]: resource === 'users' ? event.target.value : event.target.value || null } })} />)}</Stack>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField label="Display price" value={draft.price ?? ''} onChange={(event) => changeDraft({ price: event.target.value || null })} />
              <TextField label="Currency code" value={draft.currency ?? ''} onChange={(event) => changeDraft({ currency: event.target.value.toUpperCase() || null })} helperText="Display only; payments are recorded manually." />
            </Stack>
            <Typography variant="subtitle1">Lifecycle policy · every field requires explicit approval before publication</Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>{(['trialDays', 'graceDays'] as const).map((key) => <TextField key={key} type="number" label={key === 'trialDays' ? 'Trial days (0 disables trial)' : 'Past-due grace days (0 denies access)'} value={policy[key]} onChange={(event) => { setPolicy({ ...policy, [key]: event.target.value }); setDirty(true); setPreview(null); }} />)}</Stack>
            {([
              ['billingCycle', 'Billing cycle', ['MANUAL', 'MONTHLY', 'ANNUAL']],
              ['cancellationAccess', 'Access after cancellation', ['IMMEDIATE', 'END_OF_TERM']],
              ['downgradeTiming', 'Downgrade effective date', ['IMMEDIATE', 'AT_RENEWAL']],
              ['retention', 'Cancellation data retention', ['RETAIN']],
              ['overridePrecedence', 'Override replacement policy', ['LATEST_EFFECTIVE_REPLACEMENT']],
            ] as const).map(([key, label, values]) => <TextField select key={key} label={label} value={policy[key]} onChange={(event) => { setPolicy({ ...policy, [key]: event.target.value }); setDirty(true); setPreview(null); }}><MenuItem value="">Unapproved</MenuItem>{values.map((value) => <MenuItem key={value} value={value}>{value.replace(/_/g, ' ')}</MenuItem>)}</TextField>)}
          </Stack>
        </Box>
        <Stack direction="row" spacing={2}>
          <AppButton disabled={!allowedAction || immutable || draft.quotas.users === ''} onClick={() => operation.mutate(async () => { const result = await api.saveVersion(planId!, versionId, { ...draft, policy: policyValue(), reason }); setVersionId(result.versionId); setDirty(false); setPreview(null); })}>Save draft</AppButton>
          <AppButton color="warning" disabled={!allowedAction || immutable || versionId === null} onClick={() => operation.mutate(async () => { await api.deleteVersion(planId!, versionId!, reason); setEditing(false); setVersionId(null); setPreview(null); })}>Delete unpublished draft</AppButton>
          <AppButton disabled={operation.isPending || versionId === null || dirty} onClick={() => operation.mutate(async () => { const result = await api.preview(planId!, versionId!); chooseVersion(result.version); setPreview(result); })}>Preview saved revision</AppButton>
          <AppButton variant="contained" disabled={!allowedAction || immutable || dirty || preview === null || preview.errors.length > 0} onClick={() => operation.mutate(async () => { await api.publish(planId!, versionId!, reason, preview!.previewToken); setPreview(null); })}>Publish approved revision</AppButton>
        </Stack>
        {preview !== null ? <Alert severity={preview.errors.length ? 'warning' : 'success'}>{preview.errors.length ? preview.errors.join(' · ') : 'Preview passed. Review the saved feature matrix, quotas, pricing and policies above before publishing.'}</Alert> : null}
      </Stack> : null}
      <Typography variant="h6">Global feature availability</Typography>
      {features.isError ? <ErrorState message="Feature registry could not be loaded." onRetry={() => { void features.refetch(); }} /> : features.data?.features.map((feature) => <Stack key={feature.key} direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center"><Typography flex={1}>{feature.description} · {feature.switch?.hardDisabled ? 'Hard disabled' : 'Available'}{feature.switch?.reason ? ` · ${feature.switch.reason}` : ''}</Typography><AppButton disabled={!allowedAction} color={feature.switch?.hardDisabled ? 'success' : 'warning'} onClick={() => operation.mutate(() => api.switchFeature(feature.key, !feature.switch?.hardDisabled, reason))}>{feature.switch?.hardDisabled ? 'Restore availability' : 'Hard disable'}</AppButton></Stack>)}
      <PlatformAuditPanel firmId={null} />
    </Stack>
  </PageContainer>;
}
