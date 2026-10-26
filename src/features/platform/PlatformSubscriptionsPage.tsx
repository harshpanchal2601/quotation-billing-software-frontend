import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { apiClient, toApiError, type ApiSuccessResponse } from '@shared/api/apiClient';
import { ErrorState } from '@shared/components/common/ErrorState';
import { AppButton } from '@shared/ui/actions';
import { PageContainer, PageHeader } from '@shared/ui/layout';
import { EffectiveAccessPanel } from './EffectiveAccessPanel';
import { PlatformAuditPanel } from './PlatformAuditPanel';
import { subscriptionsApi as api } from './subscriptions.api';
import type { OverrideInput, SubscriptionInput } from './subscriptions.types';
import type { PlatformFirm } from './platform.types';
import { usePlatformOperation } from './usePlatformOperation';
import { UsageEventsPanel } from './UsageEventsPanel';

function dateValue(value: string) { return value === '' ? null : new Date(value).toISOString(); }

export function PlatformSubscriptionsPage() {
  const [params, setParams] = useSearchParams();
  const firmId = Number(params.get('firmId'));
  const validFirm = Number.isSafeInteger(firmId) && firmId > 0;
  const [search, setSearch] = useState('');
  const [firmPage, setFirmPage] = useState(1);
  const firms = useQuery({ queryKey: ['platform', 'firm-options', search, firmPage], queryFn: async ({ signal }) => {
    const response = await apiClient.get<ApiSuccessResponse<{ firms: PlatformFirm[]; pagination: { totalPages: number } }>>('/platform/firms', { params: { search: search || undefined, page: firmPage, limit: 20 }, signal });
    return response.data.data;
  } });
  return <PageContainer><PageHeader title="Subscriptions" description="Manage firm assignments, exceptions, usage and manual subscription payments." />
    <Stack spacing={3}>
      <TextField label="Find firm" value={search} onChange={(event) => { setSearch(event.target.value); setFirmPage(1); }} />
      {firms.isError ? <ErrorState message="Firms could not be loaded." onRetry={() => { void firms.refetch(); }} /> : null}
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>{firms.data?.firms.map((firm) => <AppButton key={firm.id} variant={firm.id === firmId ? 'contained' : 'outlined'} onClick={() => setParams({ firmId: String(firm.id) })}>{firm.displayName}</AppButton>)}</Stack>
      <Stack direction="row" spacing={2}><AppButton disabled={firmPage === 1} onClick={() => setFirmPage(firmPage - 1)}>Previous firms</AppButton><AppButton disabled={firmPage >= (firms.data?.pagination.totalPages ?? 0)} onClick={() => setFirmPage(firmPage + 1)}>Next firms</AppButton></Stack>
      {validFirm ? <FirmSubscriptionEditor key={firmId} firmId={firmId} /> : <Alert severity="info">Select a firm to manage its subscription.</Alert>}
    </Stack>
  </PageContainer>;
}

function FirmSubscriptionEditor({ firmId }: { firmId: number }) {
  const operation = usePlatformOperation();
  const [reason, setReason] = useState('');
  const [planPage, setPlanPage] = useState(1);
  const [planId, setPlanId] = useState<number | null>(null);
  const [versionId, setVersionId] = useState('');
  const [status, setStatus] = useState<SubscriptionInput['status']>('ACTIVE');
  const [dates, setDates] = useState({ effectiveFrom: '', effectiveUntil: '', trialEndsAt: '', graceEndsAt: '', currentPeriodEndsAt: '', renewalAt: '' });
  const [target, setTarget] = useState('feature:firm.core');
  const [effect, setEffect] = useState<OverrideInput['effect']>('DENY');
  const [limit, setLimit] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [chargeAmount, setChargeAmount] = useState('');
  const [currency, setCurrency] = useState('');
  const [chargeKey, setChargeKey] = useState(() => crypto.randomUUID());
  const [paymentKey, setPaymentKey] = useState(() => crypto.randomUUID());
  const [chargeId, setChargeId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentKind, setPaymentKind] = useState<'PAYMENT' | 'REFUND'>('PAYMENT');
  const [reference, setReference] = useState('');
  const [pages, setPages] = useState({ subscriptions: 1, overrides: 1, charges: 1 });
  const details = useQuery({ queryKey: ['platform', 'subscription', firmId, pages], queryFn: ({ signal }) => api.firm(firmId, pages, signal) });
  const plans = useQuery({ queryKey: ['platform', 'plans', planPage], queryFn: ({ signal }) => api.plans(planPage, signal) });
  const plan = useQuery({ queryKey: ['platform', 'plan', planId], queryFn: ({ signal }) => api.plan(planId!, signal), enabled: planId !== null });
  const allowedAction = reason.trim().length >= 10 && !operation.isPending;
  const quotas = details.data?.access.quotas ?? [];

  function assign() {
    if (!details.data) return;
    const input: SubscriptionInput = {
      planVersionId: Number(versionId), expectedSubscriptionId: details.data.access.subscription?.id ?? null,
      status, reason, effectiveFrom: dates.effectiveFrom ? new Date(dates.effectiveFrom).toISOString() : new Date().toISOString(),
      effectiveUntil: dateValue(dates.effectiveUntil), trialEndsAt: dateValue(dates.trialEndsAt),
      graceEndsAt: dateValue(dates.graceEndsAt), currentPeriodEndsAt: dateValue(dates.currentPeriodEndsAt), renewalAt: dateValue(dates.renewalAt),
    };
    operation.mutate(async () => { await api.assign(firmId, input); setDates((current) => ({ ...current, effectiveFrom: '' })); });
  }

  return <Stack spacing={3}>
    <Typography variant="h5">Firm {firmId}</Typography>
    {operation.isError ? <ErrorState message={toApiError(operation.error).message} /> : null}
    {operation.isSuccess ? <Alert severity="success">Platform operation completed.</Alert> : null}
    {details.isError ? <ErrorState message="Firm subscription could not be loaded." onRetry={() => { void details.refetch(); }} /> : null}
    {details.data ? <EffectiveAccessPanel access={details.data.access} /> : null}
    <TextField required label="Reason for firm change" value={reason} onChange={(event) => setReason(event.target.value)} helperText="At least 10 characters. All actions are recorded in platform audit history." />
    <AppButton disabled={!allowedAction || details.data === undefined} onClick={() => operation.mutate(() => api.reconcile(firmId, reason))}>Reconcile managed usage</AppButton>
    <Typography variant="h6">Assign plan revision or update lifecycle</Typography>
    {plans.isError || plan.isError ? <ErrorState message="Plans could not be loaded." onRetry={() => { void plans.refetch(); if (planId !== null) void plan.refetch(); }} /> : null}
    <TextField select label="Plan" value={planId ?? ''} onChange={(event) => { setPlanId(Number(event.target.value)); setVersionId(''); }}><MenuItem value="">Select plan</MenuItem>{plans.data?.plans.filter((entry) => !entry.isLegacy && entry.archivedAt === null).map((entry) => <MenuItem key={entry.id} value={entry.id}>{entry.name}</MenuItem>)}</TextField>
    <Stack direction="row" spacing={2}><AppButton disabled={planPage === 1} onClick={() => setPlanPage(planPage - 1)}>Previous plans</AppButton><AppButton disabled={planPage * 50 >= (plans.data?.total ?? 0)} onClick={() => setPlanPage(planPage + 1)}>Next plans</AppButton></Stack>
    <TextField select label="Published revision" value={versionId} onChange={(event) => setVersionId(event.target.value)}><MenuItem value="">Select revision</MenuItem>{details.data?.access.subscription && !plan.data?.versions.some((version) => version.id === details.data!.access.subscription!.planVersionId) ? <MenuItem value={String(details.data.access.subscription.planVersionId)}>Keep current {details.data.access.subscription.planName} revision {details.data.access.subscription.revision}</MenuItem> : null}{plan.data?.versions.filter((version) => version.publishedAt !== null).map((version) => <MenuItem key={version.id} value={String(version.id)}>Revision {version.revision} · {version.price === null ? 'No display price' : `${version.currency} ${version.price}`}</MenuItem>)}</TextField>
    {plan.data?.versions.find((version) => version.id === Number(versionId))?.policy ? <Alert severity="info">Published policy: {JSON.stringify(plan.data.versions.find((version) => version.id === Number(versionId))?.policy)}</Alert> : null}
    <TextField select label="Subscription state" value={status} onChange={(event) => setStatus(event.target.value)}>{['TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'SUSPENDED'].map((value) => <MenuItem key={value} value={value}>{value.replace(/_/g, ' ')}</MenuItem>)}</TextField>
    <Stack direction={{ xs: 'column', md: 'row' }} flexWrap="wrap" useFlexGap spacing={2}>{(Object.keys(dates) as Array<keyof typeof dates>).map((key) => <TextField key={key} type="datetime-local" label={({ effectiveFrom: 'Effective from', effectiveUntil: 'Access ends', trialEndsAt: 'Trial ends', graceEndsAt: 'Grace ends', currentPeriodEndsAt: 'Current term ends', renewalAt: 'Renewal date' })[key]} value={dates[key]} InputLabelProps={{ shrink: true }} onChange={(event) => setDates({ ...dates, [key]: event.target.value })} />)}</Stack>
    <Typography color="text.secondary">Leave Effective from blank to apply when submitted. Other blank dates remain unset.</Typography>
    <AppButton variant="contained" disabled={!allowedAction || !versionId || details.data === undefined} onClick={assign}>Apply explicit assignment</AppButton>
    {details.data?.subscriptions.map((subscription) => <Stack key={subscription.id} direction={{ xs: 'column', md: 'row' }} spacing={2}><Typography flex={1}>{subscription.status} · revision ID {subscription.planVersionId} · starts {new Date(subscription.effectiveFrom).toLocaleString()} · ends {subscription.effectiveUntil ? new Date(subscription.effectiveUntil).toLocaleString() : 'No scheduled end'} · {subscription.reason}</Typography>{new Date(subscription.effectiveFrom) > new Date() ? <AppButton disabled={!allowedAction} onClick={() => operation.mutate(() => api.cancelScheduled(firmId, subscription.id, reason))}>Cancel scheduled assignment</AppButton> : null}</Stack>)}
    <HistoryPagination label="subscriptions" page={pages.subscriptions} totalPages={details.data?.pagination.subscriptions.totalPages ?? 1} onChange={(page) => setPages({ ...pages, subscriptions: page })} />
    <Typography variant="h6">Platform overrides</Typography>
    <Typography color="text.secondary">The latest effective replacement wins. Expiry or revocation returns to the plan; older grants are not revived. A global hard disable always denies.</Typography>
    <TextField select label="Override target" value={target} onChange={(event) => { setTarget(event.target.value); setEffect(event.target.value.startsWith('quota:') ? 'LIMIT' : 'DENY'); }}>
      {details.data?.access.features.map((feature) => <MenuItem key={feature.key} value={`feature:${feature.key}`}>{feature.description}</MenuItem>)}
      {quotas.map((quota) => <MenuItem key={quota.resource} value={`quota:${quota.resource}`}>{quota.resource} limit</MenuItem>)}
    </TextField>
    <TextField select label="Override effect" value={effect} onChange={(event) => setEffect(event.target.value as OverrideInput['effect'])}>{(target.startsWith('quota:') ? ['LIMIT'] : ['ALLOW', 'DENY']).map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}</TextField>
    {target.startsWith('quota:') ? <TextField label="Replacement limit" value={limit} onChange={(event) => setLimit(event.target.value)} helperText="Blank means unlimited, except users require a positive finite limit." /> : null}
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}><TextField type="datetime-local" label="Override starts" InputLabelProps={{ shrink: true }} value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /><TextField type="datetime-local" label="Override expires (blank is permanent)" InputLabelProps={{ shrink: true }} value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></Stack>
    <Typography color="text.secondary">Leave Override starts blank to apply when submitted.</Typography>
    <AppButton disabled={!allowedAction || !details.data} onClick={() => operation.mutate(() => api.override(firmId, { target, effect, limit: effect === 'LIMIT' ? limit || null : null, startsAt: startsAt ? new Date(startsAt).toISOString() : new Date().toISOString(), expiresAt: dateValue(expiresAt), reason }))}>Apply audited override</AppButton>
    {details.data?.overrides.map((override) => <Stack key={override.id} direction={{ xs: 'column', md: 'row' }} spacing={2}><Typography flex={1}>{override.target} · {override.effect}{override.effect === 'LIMIT' ? ` ${override.limit ?? 'Unlimited'}` : ''} · starts {new Date(override.startsAt).toLocaleString()} · expires {override.expiresAt ? new Date(override.expiresAt).toLocaleString() : 'Never'} · actor {override.authorId} · {override.reason}{override.revokedAt ? ' · revoked' : ''}</Typography><AppButton disabled={!allowedAction || override.revokedAt !== null} onClick={() => operation.mutate(() => api.revoke(firmId, override.id, reason))}>Revoke</AppButton></Stack>)}
    <HistoryPagination label="overrides" page={pages.overrides} totalPages={details.data?.pagination.overrides.totalPages ?? 1} onChange={(page) => setPages({ ...pages, overrides: page })} />
    <Typography variant="h6">Manual platform ledger</Typography>
    <Alert severity="info">Payments are administrative records. Checkout and automatic renewals require an approved and verified provider.</Alert>
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}><TextField label="Charge amount" value={chargeAmount} onChange={(event) => setChargeAmount(event.target.value)} /><TextField label="Charge currency" value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} /><AppButton disabled={!allowedAction || !chargeAmount || currency.length !== 3} onClick={() => operation.mutate(async () => { await api.charge(firmId, { amount: chargeAmount, currency, idempotencyKey: chargeKey, reason }); setChargeKey(crypto.randomUUID()); setChargeAmount(''); })}>Record charge</AppButton></Stack>
    {details.data?.charges.map((charge) => <Typography key={charge.id}>Charge {charge.id} · {charge.currency} {charge.amount} · {charge.reason}{charge.payments.map((payment) => ` · ${payment.kind} ${payment.amount} (${payment.reference})`).join('')}</Typography>)}
    <HistoryPagination label="charges" page={pages.charges} totalPages={details.data?.pagination.charges.totalPages ?? 1} onChange={(page) => { setPages({ ...pages, charges: page }); setChargeId(''); }} />
    <TextField select label="Charge for payment/refund" value={chargeId} onChange={(event) => setChargeId(event.target.value)}><MenuItem value="">Select charge</MenuItem>{details.data?.charges.map((charge) => <MenuItem key={charge.id} value={String(charge.id)}>Charge {charge.id} · {charge.currency} {charge.amount}</MenuItem>)}</TextField>
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}><TextField select label="Ledger event" value={paymentKind} onChange={(event) => setPaymentKind(event.target.value as 'PAYMENT' | 'REFUND')}><MenuItem value="PAYMENT">Payment</MenuItem><MenuItem value="REFUND">Refund</MenuItem></TextField><TextField label="Payment/refund amount" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} /><TextField label="Receipt/reference" value={reference} onChange={(event) => setReference(event.target.value)} /></Stack>
    <AppButton disabled={!allowedAction || !chargeId || !paymentAmount || !reference} onClick={() => operation.mutate(async () => { await api.payment(firmId, Number(chargeId), { amount: paymentAmount, kind: paymentKind, reference, idempotencyKey: paymentKey, reason }); setPaymentKey(crypto.randomUUID()); setPaymentAmount(''); setReference(''); })}>Record manual payment event</AppButton>
    <UsageEventsPanel key={`usage-${firmId}`} firmId={firmId} />
    <PlatformAuditPanel key={firmId} firmId={firmId} />
  </Stack>;
}

function HistoryPagination({ label, page, totalPages, onChange }: { label: string; page: number; totalPages: number; onChange: (page: number) => void }) {
  return <Stack direction="row" spacing={2}><AppButton disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous {label}</AppButton><Typography>Page {page} of {totalPages}</Typography><AppButton disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Next {label}</AppButton></Stack>;
}
