import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import Stack from '@mui/material/Stack';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { toApiError } from '@shared/api/apiClient';
import { ErrorState } from '@shared/components/common/ErrorState';
import { AppButton } from '@shared/ui/actions';
import { AppDialog } from '@shared/ui/dialogs';
import { AppStatusChip } from '@shared/ui/display';
import { PageContainer, PageHeader } from '@shared/ui/layout';
import { subscriptionsApi as api } from './subscriptions.api';
import type { PlanVersion, PlanVersionInput, SubscriptionPolicy } from './subscriptions.types';
import { usePlatformOperation } from './usePlatformOperation';
import { PlatformAuditPanel } from './PlatformAuditPanel';
import { PlatformFormGrid, PlatformSection } from './PlatformSection';
import { PlatformPagination, PlatformTable } from './PlatformTable';
import { PlatformSelectField } from './PlatformSelectField';
import { useSubscriptionOptions } from './useSubscriptionOptions';

type PolicyForm = Record<keyof SubscriptionPolicy, string>;
const emptyPolicy: PolicyForm = { trialDays: '', graceDays: '', billingCycle: '', cancellationAccess: '', downgradeTiming: '', retention: '', overridePrecedence: '' };
const emptyDraft: PlanVersionInput = { features: ['firm.core'], quotas: { users: '', documents: null, storageBytes: null, aiCredits: '0' }, policy: null, price: null, currency: null, reason: '' };
type QuotaResource = keyof PlanVersionInput['quotas'];
const quotaLabels: Record<QuotaResource, string> = { users: 'Users', documents: 'Documents', storageBytes: 'Storage bytes', aiCredits: 'AI credits' };

function quotaIssue(resource: QuotaResource, value: string | null): string | null {
  if (value === null && resource !== 'users') return null;
  if (value === null || value === '') return 'Enter a positive user limit.';
  if (!/^(0|[1-9]\d{0,18})$/.test(value)) return `${quotaLabels[resource]} must be a whole number without leading zeros.`;
  const amount = BigInt(value);
  if (resource === 'users' && (amount < 1n || amount > 2147483647n)) return 'Users must be between 1 and 2147483647.';
  if (amount > 9223372036854775807n) return `${quotaLabels[resource]} exceeds the supported limit.`;
  return null;
}

export function PlatformPlansPage() {
  const [page, setPage] = useState(1);
  const [planId, setPlanId] = useState<number | null>(null);
  const [versionId, setVersionId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createReason, setCreateReason] = useState('');
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
  const choices = useSubscriptionOptions();
  const detail = useQuery({ queryKey: ['platform', 'plan', planId], queryFn: ({ signal }) => api.plan(planId!, signal), enabled: planId !== null });
  const selectedVersion = detail.data?.versions.find((version) => version.id === versionId);
  const readOnlyIssue = detail.data?.isLegacy ? 'Legacy revisions are reserved and read only.'
    : detail.data?.archivedAt != null ? 'Restore the archived plan before making changes.'
    : selectedVersion?.publishedAt != null ? 'Published revisions are read only. Copy to a new revision to make changes.' : null;
  const immutable = readOnlyIssue !== null;
  const draftFieldsDisabled = immutable || operation.isPending;
  const reasonIssue = reason.trim().length < 10 ? 'Enter a change reason of at least 10 characters.' : null;
  const allowedAction = reasonIssue === null && !operation.isPending;
  const validSlug = slug.length >= 2 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
  const quotaIssues = Object.fromEntries((Object.keys(draft.quotas) as QuotaResource[]).map((resource) => [resource, quotaIssue(resource, draft.quotas[resource])])) as Record<QuotaResource, string | null>;
  const priceIssue = draft.price !== null && !/^(0|[1-9]\d{0,15})(\.\d{1,2})?$/.test(draft.price)
    ? 'Enter a nonnegative price with at most 2 decimal places.'
    : draft.price === null && draft.currency !== null ? 'Enter a display price with the currency, or clear both fields.' : null;
  const currencyIssue = draft.currency !== null && !/^[A-Z]{3}$/.test(draft.currency)
    ? 'Choose a valid currency from the list.'
    : draft.price !== null && draft.currency === null ? 'Select a currency for the display price.' : null;
  const dayIssue = (['trialDays', 'graceDays'] as const).some((key) => policy[key] !== '' && (!Number.isInteger(Number(policy[key])) || Number(policy[key]) < 0 || Number(policy[key]) > 365))
    ? 'Trial and grace days must be whole numbers from 0 to 365.' : null;
  const pendingIssue = operation.isPending ? 'Wait for the current platform operation to finish.' : null;
  const saveBlockers = [readOnlyIssue, pendingIssue, reasonIssue, ...Object.values(quotaIssues), priceIssue, currencyIssue, dayIssue,
    features.isPending ? 'Wait for the feature registry to load.' : features.isError ? 'Reload the feature registry before saving.' : null,
    choices.isPending ? 'Wait for dropdown choices to load.' : choices.isError ? 'Reload dropdown choices before saving.' : null,
  ].filter((message): message is string => message !== null);
  const previewBlocker = pendingIssue ?? (versionId === null ? 'Save the draft before previewing.' : dirty ? 'Save your changes before previewing.' : null);
  const publishBlocker = readOnlyIssue ?? pendingIssue ?? reasonIssue ?? (versionId === null || dirty ? 'Save the draft, then preview the saved revision.' : preview === null ? 'Run Preview saved revision first.' : preview.errors.length > 0 ? 'Resolve the preview errors, then save and preview again.' : null);
  const deleteBlocker = readOnlyIssue ?? pendingIssue ?? reasonIssue ?? (versionId === null ? 'Only saved, unpublished drafts can be deleted.' : null);

  function chooseVersion(version?: PlanVersion, copy = false) {
    setVersionId(copy ? null : version?.id ?? null);
    setDraft(version ? {
      features: version.features.map((feature) => feature.featureKey),
      quotas: { users: version.quotas.find((quota) => quota.resource === 'users')?.limit ?? '', documents: version.quotas.find((quota) => quota.resource === 'documents')?.limit ?? null, storageBytes: version.quotas.find((quota) => quota.resource === 'storageBytes')?.limit ?? null, aiCredits: version.quotas.find((quota) => quota.resource === 'aiCredits')?.limit ?? null },
      policy: version.policy, price: version.price, currency: version.currency, reason: '',
    } : { ...emptyDraft, features: [...emptyDraft.features], quotas: { ...emptyDraft.quotas } });
    setPolicy(version?.policy ? Object.fromEntries(Object.entries(version.policy).map(([key, value]) => [key, String(value)])) as PolicyForm : { ...emptyPolicy });
    setEditing(true); setDirty(copy || version === undefined); setPreview(null);
  }

  function changeDraft(update: Partial<PlanVersionInput>) {
    setDraft((current) => ({ ...current, ...update })); setDirty(true); setPreview(null);
  }

  function policyValue(): SubscriptionPolicy | null {
    if (Object.values(policy).some((value) => value === '')) return null;
    return { ...policy, trialDays: Number(policy.trialDays), graceDays: Number(policy.graceDays) } as SubscriptionPolicy;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Plans & Features"
        description="Create a plan, configure a revision, then save, preview and publish it before assigning it to a firm."
        actions={<AppButton variant="contained" disabled={operation.isPending} onClick={() => { operation.reset(); setCreateOpen(true); }}>Create plan</AppButton>}
      />
      {operation.isError && !createOpen ? <ErrorState message={toApiError(operation.error).message} /> : null}
      {operation.isSuccess ? <Alert severity="success">Platform change saved.</Alert> : null}
      <PlatformSection title="Plan catalog" description="Select a plan to manage its revisions. Published revisions stay attached to existing subscriptions until you explicitly reassign them.">
        <PlatformTable
          rowNumberStart={(page - 1) * 50 + 1} label="Plans" isLoading={plans.isPending} isError={plans.isError} isEmpty={!plans.data?.plans.length}
          errorMessage="Plans could not be loaded." onRetry={() => { void plans.refetch(); }} emptyMessage="No plans created"
          columns={[{ key: 'name', label: 'Plan' }, { key: 'slug', label: 'Slug' }, { key: 'type', label: 'Type' }, { key: 'status', label: 'Availability' }, { key: 'actions', label: 'Actions', align: 'right' }]}
          pagination={<PlatformPagination label="Plans" page={page} totalPages={Math.ceil((plans.data?.total ?? 0) / 50)} onChange={setPage} disabled={operation.isPending} />}
        >
          {plans.data?.plans.map((plan) => (
            <TableRow key={plan.id} hover selected={plan.id === planId}>
              <TableCell><Typography fontWeight={600}>{plan.name}</Typography><Typography variant="caption" color="text.secondary">ID {plan.id}</Typography></TableCell>
              <TableCell>{plan.slug}</TableCell>
              <TableCell>{plan.isLegacy ? 'Legacy · read only' : 'Custom'}</TableCell>
              <TableCell><AppStatusChip label={plan.archivedAt ? 'Archived' : 'Active'} variant={plan.archivedAt ? 'neutral' : 'success'} /></TableCell>
              <TableCell align="right"><AppButton size="small" disabled={operation.isPending} onClick={() => { setPlanId(plan.id); setVersionId(null); setRename(plan.name); setEditing(false); setDirty(false); setPreview(null); }}>Manage {plan.name}</AppButton></TableCell>
            </TableRow>
          ))}
        </PlatformTable>
      </PlatformSection>
      <PlatformSection title="Change reason" description="Enter a reason before renaming, archiving, saving, publishing or changing global feature availability.">
        <TextField fullWidth label="Reason for platform change" required value={reason} inputProps={{ maxLength: 500 }} onChange={(event) => setReason(event.target.value)} helperText="At least 10 characters. Recorded with your identity in platform audit history." />
      </PlatformSection>
      {detail.isError ? <ErrorState message="Plan revisions could not be loaded." onRetry={() => { void detail.refetch(); }} /> : null}
      {planId !== null && detail.isPending ? <Alert severity="info">Loading plan revisions…</Alert> : null}
      {detail.data ? (
        <PlatformSection
          title={`${detail.data.name} revisions`}
          description="Edit an unpublished draft or copy a published revision to prepare an updated plan."
          actions={!detail.data.isLegacy ? <AppButton variant="outlined" disabled={operation.isPending || detail.data.archivedAt !== null} onClick={() => chooseVersion(detail.data!.versions.find((version) => version.publishedAt !== null) ?? detail.data!.versions[0], true)}>New revision</AppButton> : undefined}
        >
          {detail.data.isLegacy ? <Alert severity="info">Legacy revisions preserve existing access and user limits. They are reserved and immutable.</Alert> : (
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'flex-start' }}>
              <TextField label="Plan display name" value={rename} inputProps={{ maxLength: 191 }} onChange={(event) => setRename(event.target.value)} sx={{ flex: 1 }} />
              <AppButton disabled={!allowedAction || rename.trim().length < 2} onClick={() => operation.mutate(() => api.updatePlan(planId!, { name: rename, archived: detail.data!.archivedAt !== null, reason }))}>Rename plan</AppButton>
              <AppButton color={detail.data.archivedAt ? 'success' : 'warning'} disabled={!allowedAction} onClick={() => operation.mutate(() => api.updatePlan(planId!, { name: detail.data!.name, archived: detail.data!.archivedAt === null, reason }))}>{detail.data.archivedAt ? 'Restore plan' : 'Archive plan'}</AppButton>
            </Stack>
          )}
          {detail.data.archivedAt ? <Alert severity="info">Restore this plan before creating or changing revisions.</Alert> : null}
          <PlatformTable label="Plan revisions" isEmpty={detail.data.versions.length === 0} emptyMessage="No saved revisions" columns={[{ key: 'revision', label: 'Revision' }, { key: 'status', label: 'Status' }, { key: 'features', label: 'Features' }, { key: 'users', label: 'User limit' }, { key: 'price', label: 'Display price' }, { key: 'published', label: 'Published' }, { key: 'actions', label: 'Actions', align: 'right' }]}>
            {detail.data.versions.map((version) => (
              <TableRow key={version.id} hover selected={version.id === versionId}>
                <TableCell>Revision {version.revision}</TableCell>
                <TableCell><AppStatusChip label={version.publishedAt ? 'Published' : 'Draft'} variant={version.publishedAt ? 'success' : 'warning'} /></TableCell>
                <TableCell>{version.features.length}</TableCell>
                <TableCell>{version.quotas.find((quota) => quota.resource === 'users')?.limit ?? 'Unlimited'}</TableCell>
                <TableCell>{version.price === null ? 'Not set' : `${version.currency} ${version.price}`}</TableCell>
                <TableCell>{version.publishedAt ? new Date(version.publishedAt).toLocaleString() : 'Not published'}</TableCell>
                <TableCell align="right"><Stack direction="row" spacing={1} justifyContent="flex-end">
                  <AppButton size="small" disabled={operation.isPending} onClick={() => chooseVersion(version)}>{version.publishedAt || detail.data!.isLegacy ? 'View revision' : 'Edit draft'} {version.revision}</AppButton>
                  {!detail.data!.isLegacy && !detail.data!.archivedAt ? <AppButton size="small" disabled={operation.isPending} onClick={() => chooseVersion(version, true)}>Copy to new revision</AppButton> : null}
                </Stack></TableCell>
              </TableRow>
            ))}
          </PlatformTable>
        </PlatformSection>
      ) : null}
      {editing && detail.data ? (
        <PlatformSection title={versionId === null ? 'New revision' : `Revision ${selectedVersion?.revision ?? ''}`} description="1. Configure features, limits and policies. 2. Save the draft. 3. Preview the saved revision. 4. Publish after reviewing the result.">
          {immutable ? <Alert severity="info">This revision is read only. Published snapshots and legacy plans cannot be edited; archived plans must be restored first.</Alert> : null}
          {choices.isError ? <ErrorState message="Dropdown choices could not be loaded." onRetry={() => { void choices.refetch(); }} /> : null}
          <Box component="fieldset" disabled={draftFieldsDisabled} sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}>
            <Stack spacing={3}>
              <Typography component="h3" variant="h4">Included features</Typography>
              <PlatformTable label="Revision features" isLoading={features.isPending} isError={features.isError} isEmpty={!features.data?.features.length} errorMessage="Feature registry could not be loaded." onRetry={() => { void features.refetch(); }} emptyMessage="No registered features" columns={[{ key: 'included', label: 'Included' }, { key: 'name', label: 'Feature' }, { key: 'module', label: 'Module' }, { key: 'dependencies', label: 'Dependencies' }]}>
                {features.data?.features.map((feature) => (
                  <TableRow key={feature.key}>
                    <TableCell><Checkbox inputProps={{ 'aria-label': feature.description }} checked={draft.features.includes(feature.key)} disabled={feature.required || draftFieldsDisabled} onChange={(_, checked) => changeDraft({ features: checked ? [...draft.features, feature.key] : draft.features.filter((key) => key !== feature.key) })} /></TableCell>
                    <TableCell><Typography>{feature.description}</Typography><Typography variant="caption" color="text.secondary">{feature.key}{feature.required ? ' · Required' : ''}</Typography></TableCell>
                    <TableCell>{feature.module}</TableCell>
                    <TableCell>{feature.dependencies.join(', ') || 'None'}</TableCell>
                  </TableRow>
                ))}
              </PlatformTable>
              <Typography component="h3" variant="h4">Usage limits</Typography>
              <PlatformFormGrid>
                {(Object.keys(draft.quotas) as QuotaResource[]).map((resource) => (
                  <TextField key={resource} label={quotaLabels[resource]} value={draft.quotas[resource] ?? ''} required={resource === 'users'} inputProps={{ inputMode: 'numeric' }} error={draft.quotas[resource] !== '' && quotaIssues[resource] !== null} helperText={quotaIssues[resource] ?? (resource === 'users' ? 'Required positive user limit.' : 'Blank means unlimited; 0 means no allowance.')} onChange={(event) => changeDraft({ quotas: { ...draft.quotas, [resource]: resource === 'users' ? event.target.value : event.target.value || null } })} />
                ))}
              </PlatformFormGrid>
              <Typography component="h3" variant="h4">Pricing</Typography>
              <PlatformFormGrid>
                <TextField label="Display price" value={draft.price ?? ''} error={priceIssue !== null} onChange={(event) => changeDraft({ price: event.target.value || null })} helperText={priceIssue ?? 'Optional. Supply both price and currency, or leave both blank.'} />
                <PlatformSelectField label="Currency code" value={draft.currency ?? ''} options={choices.data?.currencies ?? []} emptyLabel="No display currency" disabled={draftFieldsDisabled || choices.isPending || choices.isError} error={currencyIssue !== null} onChange={(value) => changeDraft({ currency: value || null })} helperText={currencyIssue ?? (choices.isPending ? 'Loading currencies…' : 'Choose a currency. Payments are recorded manually.')} />
              </PlatformFormGrid>
              <Typography component="h3" variant="h4">Lifecycle policy</Typography>
              <Typography color="text.secondary">Every field requires explicit approval before publication.</Typography>
              <PlatformFormGrid>
                {(['trialDays', 'graceDays'] as const).map((key) => <TextField key={key} type="number" inputProps={{ min: 0, max: 365, step: 1 }} label={key === 'trialDays' ? 'Trial days (0 disables trial)' : 'Past-due grace days (0 denies access)'} value={policy[key]} helperText="Whole days from 0 to 365." onChange={(event) => { setPolicy({ ...policy, [key]: event.target.value }); setDirty(true); setPreview(null); }} />)}
                {([
                  ['billingCycle', 'Billing cycle'],
                  ['cancellationAccess', 'Access after cancellation'],
                  ['downgradeTiming', 'Downgrade effective date'],
                  ['retention', 'Cancellation data retention'],
                  ['overridePrecedence', 'Override replacement policy'],
                ] as const).map(([key, label]) => <PlatformSelectField key={key} label={label} value={policy[key]} options={choices.data?.policy[key] ?? []} emptyLabel="Unapproved" disabled={draftFieldsDisabled || choices.isPending || choices.isError} onChange={(value) => { setPolicy({ ...policy, [key]: value }); setDirty(true); setPreview(null); }} />)}
              </PlatformFormGrid>
            </Stack>
          </Box>
          <TextField fullWidth required label="Reason for revision change" value={reason} disabled={immutable || operation.isPending} error={reason !== '' && reasonIssue !== null} inputProps={{ maxLength: 500 }} onChange={(event) => setReason(event.target.value)} helperText="At least 10 characters. This is the same audit reason used by the platform change field above." />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }, gap: 2 }}>
            <Stack spacing={1}>
              <AppButton variant="outlined" aria-describedby="save-draft-help" disabled={saveBlockers.length > 0} onClick={() => operation.mutate(async () => { const result = await api.saveVersion(planId!, versionId, { ...draft, policy: policyValue(), reason }); setVersionId(result.versionId); setDirty(false); setPreview(null); })}>Save draft</AppButton>
              <Typography id="save-draft-help" variant="caption" color="text.secondary">{saveBlockers.length ? saveBlockers.join(' ') : 'Ready to save. You can complete lifecycle approval before publishing.'}</Typography>
            </Stack>
            <Stack spacing={1}>
              <AppButton aria-describedby="preview-revision-help" disabled={previewBlocker !== null} onClick={() => operation.mutate(async () => { const result = await api.preview(planId!, versionId!); chooseVersion(result.version); setPreview(result); })}>Preview saved revision</AppButton>
              <Typography id="preview-revision-help" variant="caption" color="text.secondary">{previewBlocker ?? 'Ready to check the saved revision for publication.'}</Typography>
            </Stack>
            <Stack spacing={1}>
              <AppButton variant="contained" aria-describedby="publish-revision-help" disabled={publishBlocker !== null} onClick={() => operation.mutate(async () => { await api.publish(planId!, versionId!, reason, preview!.previewToken); setPreview(null); })}>Publish approved revision</AppButton>
              <Typography id="publish-revision-help" variant="caption" color="text.secondary">{publishBlocker ?? 'Preview passed. Review the saved settings before publishing.'}</Typography>
            </Stack>
            <Stack spacing={1}>
              <AppButton color="warning" aria-describedby="delete-draft-help" disabled={deleteBlocker !== null} onClick={() => operation.mutate(async () => { await api.deleteVersion(planId!, versionId!, reason); setEditing(false); setVersionId(null); setPreview(null); })}>Delete unpublished draft</AppButton>
              <Typography id="delete-draft-help" variant="caption" color="text.secondary">{deleteBlocker ?? 'Permanently remove this unpublished draft.'}</Typography>
            </Stack>
          </Box>
          {preview !== null ? <Alert severity={preview.errors.length ? 'warning' : 'success'}>{preview.errors.length ? preview.errors.join(' · ') : 'Preview passed. Review the saved feature matrix, quotas, pricing and policies above before publishing.'}</Alert> : null}
        </PlatformSection>
      ) : null}
      <PlatformSection title="Global feature availability" description="These controls affect all firms. A global hard disable overrides plan features and firm grants.">
        <PlatformTable label="Global features" isLoading={features.isPending} isError={features.isError} isEmpty={!features.data?.features.length} emptyMessage="No registered features" errorMessage="Feature registry could not be loaded." onRetry={() => { void features.refetch(); }} columns={[{ key: 'feature', label: 'Feature' }, { key: 'module', label: 'Module' }, { key: 'dependencies', label: 'Dependencies' }, { key: 'status', label: 'Availability' }, { key: 'reason', label: 'Last change reason' }, { key: 'actions', label: 'Actions', align: 'right' }]}>
          {features.data?.features.map((feature) => (
            <TableRow key={feature.key}>
              <TableCell><Typography>{feature.description}</Typography><Typography variant="caption" color="text.secondary">{feature.key}</Typography></TableCell>
              <TableCell>{feature.module}</TableCell><TableCell>{feature.dependencies.join(', ') || 'None'}</TableCell>
              <TableCell><AppStatusChip label={feature.switch?.hardDisabled ? 'Hard disabled' : 'Available'} variant={feature.switch?.hardDisabled ? 'error' : 'success'} /></TableCell>
              <TableCell sx={{ minWidth: 180, overflowWrap: 'anywhere' }}>{feature.switch?.reason || '—'}</TableCell>
              <TableCell align="right"><AppButton size="small" disabled={!allowedAction} color={feature.switch?.hardDisabled ? 'success' : 'warning'} onClick={() => operation.mutate(() => api.switchFeature(feature.key, !feature.switch?.hardDisabled, reason))}>{feature.switch?.hardDisabled ? 'Restore availability' : 'Hard disable'}</AppButton></TableCell>
            </TableRow>
          ))}
        </PlatformTable>
      </PlatformSection>
      <PlatformAuditPanel firmId={null} />
      <AppDialog open={createOpen} title="Create plan" description="Create the plan, then configure and publish its first revision." fullWidth maxWidth="sm" onClose={() => setCreateOpen(false)} preventClose={operation.isPending} showCloseButton actions={<><AppButton disabled={operation.isPending} onClick={() => setCreateOpen(false)}>Cancel</AppButton><AppButton variant="contained" isLoading={operation.isPending} disabled={name.trim().length < 2 || !validSlug || createReason.trim().length < 10} onClick={() => operation.mutate(async () => { const plan = await api.createPlan({ name: name.trim(), slug, reason: createReason }); setPlanId(plan.id); setRename(plan.name); setReason(createReason); chooseVersion(); setCreateOpen(false); setName(''); setSlug(''); setCreateReason(''); })}>Create draft plan</AppButton></>}>
        <Stack spacing={2} sx={{ pt: 2 }}>
          {operation.isError ? <ErrorState message={toApiError(operation.error).message} /> : null}
          <TextField required fullWidth label="Plan name" value={name} inputProps={{ maxLength: 191 }} onChange={(event) => setName(event.target.value)} />
          <TextField required fullWidth label="Plan slug" value={slug} inputProps={{ maxLength: 100 }} error={slug !== '' && !validSlug} helperText="At least 2 characters: lowercase letters, numbers and single hyphens. Example: business-plus." onChange={(event) => setSlug(event.target.value)} />
          <TextField required fullWidth label="Reason for creating plan" value={createReason} inputProps={{ maxLength: 500 }} helperText="At least 10 characters. Recorded in platform audit history." onChange={(event) => setCreateReason(event.target.value)} />
        </Stack>
      </AppDialog>
    </PageContainer>
  );
}
