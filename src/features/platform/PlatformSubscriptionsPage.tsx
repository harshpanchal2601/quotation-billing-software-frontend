import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { apiClient, toApiError, type ApiSuccessResponse } from '@shared/api/apiClient';
import { ErrorState } from '@shared/components/common/ErrorState';
import { AppButton } from '@shared/ui/actions';
import { AppStatusChip } from '@shared/ui/display';
import { PageContainer, PageHeader } from '@shared/ui/layout';
import { EffectiveAccessPanel } from './EffectiveAccessPanel';
import { PlatformAuditPanel } from './PlatformAuditPanel';
import { subscriptionsApi as api } from './subscriptions.api';
import type { OverrideInput, SubscriptionInput } from './subscriptions.types';
import type { PlatformFirm } from './platform.types';
import { usePlatformOperation } from './usePlatformOperation';
import { UsageEventsPanel } from './UsageEventsPanel';
import { AssistantModeControls } from './AssistantModeControls';
import { PlatformFormGrid, PlatformSection } from './PlatformSection';
import { PlatformPagination, PlatformTable } from './PlatformTable';
import { PlatformSelectField } from './PlatformSelectField';
import { useSubscriptionOptions } from './useSubscriptionOptions';

function dateValue(value: string) { return value === '' ? null : new Date(value).toISOString(); }
function localDateInput(value: string | null) {
  if (value === null) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
type EditorTab = 'access' | 'assignment' | 'overrides' | 'billing' | 'activity';

export function PlatformSubscriptionsPage() {
  const [params, setParams] = useSearchParams();
  const firmId = Number(params.get('firmId'));
  const validFirm = Number.isSafeInteger(firmId) && firmId > 0;
  const [search, setSearch] = useState('');
  const [firmPage, setFirmPage] = useState(1);
  const firms = useQuery({ queryKey: ['platform', 'firm-options', search, firmPage], queryFn: async ({ signal }) => {
    const response = await apiClient.get<ApiSuccessResponse<{ firms: PlatformFirm[]; pagination: { totalPages: number; total: number } }>>('/platform/firms', { params: { search: search || undefined, page: firmPage, limit: 20 }, signal });
    return response.data.data;
  } });
  return (
    <PageContainer>
      <PageHeader title="Subscriptions" description="Select a firm to review access, assign a published plan, manage exceptions and record payments." actions={<AppButton component={Link} to="/platform/plans" variant="outlined">Manage plans</AppButton>} />
      <PlatformSection title="Firm subscriptions" description="Choose Manage subscription to view a firm's current plan and subscription history.">
        <TextField fullWidth label="Find firm" placeholder="Search by firm name or slug" value={search} onChange={(event) => { setSearch(event.target.value); setFirmPage(1); }} />
        <PlatformTable label="Subscription firms" isLoading={firms.isPending} isError={firms.isError} isEmpty={!firms.data?.firms.length} emptyMessage="No matching firms" errorMessage="Firms could not be loaded." onRetry={() => { void firms.refetch(); }} columns={[{ key: 'firm', label: 'Firm' }, { key: 'email', label: 'Administrator email' }, { key: 'users', label: 'Users / limit' }, { key: 'status', label: 'Firm status' }, { key: 'actions', label: 'Actions', align: 'right' }]} pagination={<PlatformPagination label="Firms" page={firmPage} totalPages={firms.data?.pagination.totalPages ?? 1} onChange={setFirmPage} />}>
          {firms.data?.firms.map((firm) => (
            <TableRow key={firm.id} hover selected={firm.id === firmId}>
              <TableCell><Typography fontWeight={600}>{firm.displayName || firm.name}</Typography><Typography variant="caption" color="text.secondary">{firm.slug} · ID {firm.id}</Typography></TableCell>
              <TableCell>{firm.administratorEmail ?? '—'}</TableCell>
              <TableCell>{firm.userCount} / {firm.userLimit}</TableCell>
              <TableCell><AppStatusChip label={firm.status} variant={firm.status === 'ACTIVE' ? 'success' : 'warning'} /></TableCell>
              <TableCell align="right"><AppButton size="small" onClick={() => setParams({ firmId: String(firm.id) })}>Manage subscription</AppButton></TableCell>
            </TableRow>
          ))}
        </PlatformTable>
      </PlatformSection>
      {validFirm ? <FirmSubscriptionEditor key={firmId} firmId={firmId} firmName={firms.data?.firms.find((firm) => firm.id === firmId)?.displayName} /> : <Alert severity="info">Select a firm to manage its subscription. New plans must have a published revision before assignment.</Alert>}
    </PageContainer>
  );
}

function FirmSubscriptionEditor({ firmId, firmName }: { firmId: number; firmName?: string }) {
  const operation = usePlatformOperation();
  const [reason, setReason] = useState('');
  const [tab, setTab] = useState<EditorTab>('access');
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
  const choices = useSubscriptionOptions();
  const choicesReady = choices.data !== undefined && !choices.isPending && !choices.isError;
  const reasonIssue = reason.trim().length < 10 ? 'Enter a change reason of at least 10 characters.' : null;
  const allowedAction = reasonIssue === null && !operation.isPending;
  const assignmentBlockers = [reasonIssue,
    operation.isPending ? 'Wait for the current platform operation to finish.' : null,
    versionId === '' ? 'Choose a published plan revision.' : null,
    plan.isFetching ? 'Wait for the plan revisions to finish loading.' : null,
    !choicesReady ? (choices.isError ? 'Retry loading dropdown choices before applying.' : 'Wait for dropdown choices to load.') : null,
  ].filter((message): message is string => message !== null);
  const quotas = details.data?.access.quotas ?? [];
  const current = details.data?.access.subscription;
  const selectedPolicy = plan.data?.versions.find((version) => version.id === Number(versionId))?.policy;

  function loadCurrent() {
    if (!current) return;
    setPlanId(null); setVersionId(String(current.planVersionId)); setStatus(current.status);
    setDates({ effectiveFrom: '', effectiveUntil: localDateInput(current.effectiveUntil), trialEndsAt: localDateInput(current.trialEndsAt), graceEndsAt: localDateInput(current.graceEndsAt), currentPeriodEndsAt: localDateInput(current.currentPeriodEndsAt), renewalAt: localDateInput(current.renewalAt) });
  }

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

  return (
    <Stack spacing={3}>
      {operation.isError && tab !== 'assignment' ? <ErrorState message={toApiError(operation.error).message} /> : null}
      {operation.isSuccess ? <Alert severity="success">Platform operation completed.</Alert> : null}
      {details.isError ? <ErrorState message="Firm subscription could not be loaded." onRetry={() => { void details.refetch(); }} /> : null}
      {details.isPending ? <Alert severity="info">Loading firm subscription…</Alert> : null}
      {choices.isError ? <ErrorState message="Dropdown choices could not be loaded. Retry to manage assignments, overrides and billing." onRetry={() => { void choices.refetch(); }} /> : null}
      <PlatformSection title={firmName ? `${firmName} · Firm ${firmId}` : `Firm ${firmId}`} description="Changes below apply only to this firm. Enter an audit reason before submitting an action.">
        {details.data ? <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center"><Typography fontWeight={600}>{current?.planName ?? 'Legacy compatible'}{current ? ` · Revision ${current.revision}` : ''}</Typography><AppStatusChip label={current?.status ?? 'Legacy access'} variant={current?.status === 'SUSPENDED' || current?.status === 'CANCELLED' ? 'warning' : 'info'} /></Stack> : null}
        <TextField fullWidth required label="Reason for firm change" value={reason} inputProps={{ maxLength: 500 }} onChange={(event) => setReason(event.target.value)} helperText="At least 10 characters. All actions are recorded in platform audit history." />
      </PlatformSection>
      <Tabs value={tab} onChange={(_, value: EditorTab) => setTab(value)} variant="scrollable" scrollButtons="auto" aria-label="Firm subscription management">
        {([['access', 'Access & usage'], ['assignment', 'Plan assignment'], ['overrides', 'Overrides'], ['billing', 'Billing'], ['activity', 'Activity']] as const).map(([value, label]) => <Tab key={value} value={value} label={label} id={`firm-${firmId}-tab-${value}`} aria-controls={`firm-${firmId}-panel-${value}`} />)}
      </Tabs>
      {details.data ? (
        <Stack role="tabpanel" id={`firm-${firmId}-panel-${tab}`} aria-labelledby={`firm-${firmId}-tab-${tab}`} spacing={3}>
          {tab === 'access' ? <>
            <PlatformSection title="Effective access" description="Current plan entitlements, firm overrides and global availability determine the access shown here." actions={<AppButton disabled={!allowedAction} onClick={() => operation.mutate(() => api.reconcile(firmId, reason))}>Reconcile managed usage</AppButton>}>
              <EffectiveAccessPanel access={details.data.access} />
            </PlatformSection>
            <PlatformSection title="Firm access controls">
              <AssistantModeControls firmId={firmId} access={details.data.access} reason={reason} pending={operation.isPending} onChange={(work) => operation.mutate(work)} />
            </PlatformSection>
          </> : null}
          {tab === 'assignment' ? <>
            <PlatformSection title="Assign a plan or update lifecycle" description="Choose a published revision, or load the current subscription to update its status and dates. Applying creates an audited assignment; it does not change the plan itself." actions={current ? <AppButton variant="outlined" disabled={operation.isPending} onClick={loadCurrent}>Load current settings</AppButton> : undefined}>
              {plans.isError || plan.isError ? <ErrorState message="Plans could not be loaded." onRetry={() => { void plans.refetch(); if (planId !== null) void plan.refetch(); }} /> : null}
              <PlatformFormGrid>
                <TextField fullWidth select label="Plan" value={planId ?? ''} helperText="Only active custom plans can be newly assigned." onChange={(event) => { setPlanId(event.target.value ? Number(event.target.value) : null); setVersionId(''); }}>
                  <MenuItem value="">Select plan</MenuItem>{plans.data?.plans.filter((entry) => !entry.isLegacy && entry.archivedAt === null).map((entry) => <MenuItem key={entry.id} value={entry.id}>{entry.name}</MenuItem>)}
                </TextField>
                <TextField fullWidth select label="Published revision" value={versionId} helperText={plan.isFetching ? 'Loading revisions…' : 'Draft revisions must be published in Plans & Features first.'} onChange={(event) => setVersionId(event.target.value)}>
                  <MenuItem value="">Select revision</MenuItem>
                  {current && !plan.data?.versions.some((version) => version.id === current.planVersionId) ? <MenuItem value={String(current.planVersionId)}>Keep current: {current.planName} · Revision {current.revision}</MenuItem> : null}
                  {plan.data?.versions.filter((version) => version.publishedAt !== null).map((version) => <MenuItem key={version.id} value={String(version.id)}>Revision {version.revision} · {version.price === null ? 'No display price' : `${version.currency} ${version.price}`}</MenuItem>)}
                </TextField>
                <PlatformSelectField fullWidth label="Subscription state" value={status} options={choices.data?.subscriptionStatuses ?? []} disabled={!choicesReady} onChange={setStatus} />
              </PlatformFormGrid>
              {(plans.data?.total ?? 0) > 50 ? <PlatformPagination label="Assignable plans" page={planPage} totalPages={Math.ceil((plans.data?.total ?? 0) / 50)} onChange={(next) => { setPlanPage(next); setPlanId(null); setVersionId(''); }} disabled={operation.isPending} /> : null}
              {plan.data && plan.data.versions.every((version) => version.publishedAt === null) ? <Alert severity="info">This plan has no published revision. Save, preview and publish a revision in <Link to="/platform/plans">Plans & Features</Link> before assigning it.</Alert> : null}
              {selectedPolicy ? <Alert severity="info"><Typography fontWeight={600}>Published lifecycle policy</Typography><PlatformFormGrid>{[
                ['Billing cycle', selectedPolicy.billingCycle.replace(/_/g, ' ')], ['Trial', `${selectedPolicy.trialDays} days`], ['Past-due grace', `${selectedPolicy.graceDays} days`], ['Cancellation access', selectedPolicy.cancellationAccess.replace(/_/g, ' ')], ['Downgrade timing', selectedPolicy.downgradeTiming.replace(/_/g, ' ')], ['Data retention', selectedPolicy.retention.replace(/_/g, ' ')], ['Override precedence', selectedPolicy.overridePrecedence.replace(/_/g, ' ')],
              ].map(([label, value]) => <Typography key={label} variant="body2"><strong>{label}:</strong> {value}</Typography>)}</PlatformFormGrid></Alert> : null}
              <PlatformFormGrid>{(Object.keys(dates) as Array<keyof typeof dates>).map((key) => <TextField key={key} type="datetime-local" label={({ effectiveFrom: 'Effective from', effectiveUntil: 'Access ends', trialEndsAt: 'Trial ends', graceEndsAt: 'Grace ends', currentPeriodEndsAt: 'Current term ends', renewalAt: 'Renewal date' })[key]} value={dates[key]} InputLabelProps={{ shrink: true }} onChange={(event) => setDates({ ...dates, [key]: event.target.value })} />)}</PlatformFormGrid>
              <Typography color="text.secondary">Leave Effective from blank to apply when submitted. Other blank dates remain unset.</Typography>
              <TextField fullWidth required label="Reason for plan assignment" value={reason} disabled={operation.isPending} error={reason !== '' && reasonIssue !== null} inputProps={{ maxLength: 500 }} onChange={(event) => setReason(event.target.value)} helperText="At least 10 characters explaining this firm's plan change. Recorded in platform audit history." />
              <Stack direction="row"><AppButton variant="contained" aria-describedby="plan-assignment-help" disabled={assignmentBlockers.length > 0} onClick={assign}>Apply plan assignment</AppButton></Stack>
              <Typography id="plan-assignment-help" variant="body2" color="text.secondary">{assignmentBlockers.length ? assignmentBlockers.join(' ') : 'Ready to apply the selected revision. Leave Effective from blank for an immediate change.'}</Typography>
              {operation.isError ? <ErrorState message={toApiError(operation.error).message} /> : null}
            </PlatformSection>
            <PlatformSection title="Subscription history" description="Current and scheduled assignments are recorded separately from previous subscription periods.">
              <PlatformTable label="Subscription history" isEmpty={details.data.subscriptions.length === 0} emptyMessage="No subscription assignments" columns={[{ key: 'plan', label: 'Plan / revision' }, { key: 'status', label: 'State' }, { key: 'start', label: 'Effective from' }, { key: 'end', label: 'Access ends' }, { key: 'reason', label: 'Reason / actor' }, { key: 'actions', label: 'Actions', align: 'right' }]} pagination={<PlatformPagination label="Subscription history" page={pages.subscriptions} totalPages={details.data.pagination.subscriptions.totalPages} onChange={(page) => setPages({ ...pages, subscriptions: page })} disabled={operation.isPending} />}>
                {details.data.subscriptions.map((subscription) => (
                  <TableRow key={subscription.id} selected={subscription.id === current?.id}>
                    <TableCell><Typography fontWeight={600}>{subscription.planVersion?.plan.name ?? `Plan revision ID ${subscription.planVersionId}`}</Typography><Typography variant="caption">{subscription.planVersion ? `Revision ${subscription.planVersion.revision} · ` : ''}Assignment #{subscription.id}</Typography></TableCell>
                    <TableCell><Stack spacing={1}><AppStatusChip label={subscription.status} variant={subscription.status === 'ACTIVE' ? 'success' : 'warning'} />{subscription.id === current?.id ? <Typography variant="caption">Current assignment</Typography> : new Date(subscription.effectiveFrom) > new Date() ? <Typography variant="caption">Scheduled</Typography> : null}</Stack></TableCell>
                    <TableCell>{new Date(subscription.effectiveFrom).toLocaleString()}</TableCell><TableCell>{subscription.effectiveUntil ? new Date(subscription.effectiveUntil).toLocaleString() : 'No scheduled end'}</TableCell>
                    <TableCell sx={{ minWidth: 180, overflowWrap: 'anywhere' }}><Typography>{subscription.reason}</Typography><Typography variant="caption" color="text.secondary">Actor {subscription.authorId}</Typography></TableCell>
                    <TableCell align="right">{new Date(subscription.effectiveFrom) > new Date() ? <AppButton size="small" disabled={!allowedAction} onClick={() => operation.mutate(() => api.cancelScheduled(firmId, subscription.id, reason))}>Cancel scheduled assignment</AppButton> : '—'}</TableCell>
                  </TableRow>
                ))}
              </PlatformTable>
            </PlatformSection>
          </> : null}
          {tab === 'overrides' ? <>
            <PlatformSection title="Create firm override" description="The latest effective replacement wins. Expiry or revocation returns to the plan; older grants are not revived. A global hard disable always denies.">
              <PlatformFormGrid>
                <TextField select label="Override target" value={target} onChange={(event) => { setTarget(event.target.value); setEffect(event.target.value.startsWith('quota:') ? 'LIMIT' : 'DENY'); }}>
                  {details.data.access.features.map((feature) => <MenuItem key={feature.key} value={`feature:${feature.key}`}>{feature.description}</MenuItem>)}
                  {quotas.map((quota) => <MenuItem key={quota.resource} value={`quota:${quota.resource}`}>{quota.resource} limit</MenuItem>)}
                </TextField>
                <PlatformSelectField label="Override effect" value={effect} options={choices.data?.overrideEffects.filter((option) => target.startsWith('quota:') ? option.value === 'LIMIT' : option.value !== 'LIMIT') ?? []} disabled={!choicesReady} onChange={(value) => setEffect(value as OverrideInput['effect'])} />
                {target.startsWith('quota:') ? <TextField label="Replacement limit" value={limit} inputProps={{ inputMode: 'numeric' }} onChange={(event) => setLimit(event.target.value)} helperText="Blank means unlimited, except users require a positive finite limit." /> : null}
                <TextField type="datetime-local" label="Override starts" InputLabelProps={{ shrink: true }} value={startsAt} onChange={(event) => setStartsAt(event.target.value)} />
                <TextField type="datetime-local" label="Override expires" InputLabelProps={{ shrink: true }} value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} helperText="Blank means permanent." />
              </PlatformFormGrid>
              <Typography color="text.secondary">Leave Override starts blank to apply when submitted.</Typography>
              <Stack direction="row"><AppButton variant="contained" disabled={!allowedAction || !choicesReady} onClick={() => operation.mutate(() => api.override(firmId, { target, effect, limit: effect === 'LIMIT' ? limit || null : null, startsAt: startsAt ? new Date(startsAt).toISOString() : new Date().toISOString(), expiresAt: dateValue(expiresAt), reason }))}>Apply audited override</AppButton></Stack>
            </PlatformSection>
            <PlatformSection title="Override history">
              <PlatformTable label="Firm overrides" isEmpty={details.data.overrides.length === 0} emptyMessage="No firm overrides" columns={[{ key: 'target', label: 'Target' }, { key: 'effect', label: 'Effect / limit' }, { key: 'start', label: 'Starts' }, { key: 'expiry', label: 'Expires' }, { key: 'reason', label: 'Reason / actor' }, { key: 'actions', label: 'Actions', align: 'right' }]} pagination={<PlatformPagination label="Overrides" page={pages.overrides} totalPages={details.data.pagination.overrides.totalPages} onChange={(page) => setPages({ ...pages, overrides: page })} disabled={operation.isPending} />}>
                {details.data.overrides.map((override) => (
                  <TableRow key={override.id}>
                    <TableCell><Typography>{override.target}</Typography>{override.revokedAt ? <AppStatusChip label="Revoked" /> : null}</TableCell>
                    <TableCell>{override.effect}{override.effect === 'LIMIT' ? ` · ${override.limit ?? 'Unlimited'}` : ''}</TableCell>
                    <TableCell>{new Date(override.startsAt).toLocaleString()}</TableCell><TableCell>{override.expiresAt ? new Date(override.expiresAt).toLocaleString() : 'Never'}</TableCell>
                    <TableCell sx={{ minWidth: 180, overflowWrap: 'anywhere' }}><Typography>{override.reason}</Typography><Typography variant="caption" color="text.secondary">Actor {override.authorId}</Typography></TableCell>
                    <TableCell align="right"><AppButton size="small" disabled={!allowedAction || override.revokedAt !== null} onClick={() => operation.mutate(() => api.revoke(firmId, override.id, reason))}>Revoke</AppButton></TableCell>
                  </TableRow>
                ))}
              </PlatformTable>
            </PlatformSection>
          </> : null}
          {tab === 'billing' ? <>
            <PlatformSection title="Record a charge" description="Payments are administrative records. Checkout and automatic renewals require an approved and verified provider.">
              <PlatformFormGrid><TextField label="Charge amount" value={chargeAmount} inputProps={{ inputMode: 'decimal' }} onChange={(event) => setChargeAmount(event.target.value)} /><PlatformSelectField label="Charge currency" value={currency} options={choices.data?.currencies ?? []} emptyLabel="Select currency" disabled={!choicesReady} onChange={setCurrency} helperText={choices.isPending ? 'Loading currencies…' : 'Choose the currency for this charge.'} /></PlatformFormGrid>
              <Stack direction="row"><AppButton variant="contained" disabled={!allowedAction || !chargeAmount || currency.length !== 3 || !choicesReady} onClick={() => operation.mutate(async () => { await api.charge(firmId, { amount: chargeAmount, currency, idempotencyKey: chargeKey, reason }); setChargeKey(crypto.randomUUID()); setChargeAmount(''); })}>Record charge</AppButton></Stack>
            </PlatformSection>
            <PlatformSection title="Charge history">
              <PlatformTable label="Platform charges" isEmpty={details.data.charges.length === 0} emptyMessage="No recorded charges" columns={[{ key: 'id', label: 'Charge' }, { key: 'currency', label: 'Currency' }, { key: 'amount', label: 'Amount', align: 'right' }, { key: 'events', label: 'Payment events' }, { key: 'reason', label: 'Reason' }]} pagination={<PlatformPagination label="Charges" page={pages.charges} totalPages={details.data.pagination.charges.totalPages} onChange={(page) => { setPages({ ...pages, charges: page }); setChargeId(''); }} disabled={operation.isPending} />}>
                {details.data.charges.map((charge) => <TableRow key={charge.id}><TableCell>#{charge.id}</TableCell><TableCell>{charge.currency}</TableCell><TableCell align="right">{charge.amount}</TableCell><TableCell>{charge.payments.length}</TableCell><TableCell sx={{ minWidth: 180, overflowWrap: 'anywhere' }}>{charge.reason}</TableCell></TableRow>)}
              </PlatformTable>
            </PlatformSection>
            <PlatformSection title="Record a payment or refund" description="Select a charge from the current page and enter the amount and receipt reference.">
              <PlatformFormGrid>
                <TextField select label="Charge for payment/refund" value={chargeId} onChange={(event) => setChargeId(event.target.value)}><MenuItem value="">Select charge</MenuItem>{details.data.charges.map((charge) => <MenuItem key={charge.id} value={String(charge.id)}>Charge {charge.id} · {charge.currency} {charge.amount}</MenuItem>)}</TextField>
                <PlatformSelectField label="Ledger event" value={paymentKind} options={choices.data?.paymentKinds ?? []} disabled={!choicesReady} onChange={(value) => setPaymentKind(value as 'PAYMENT' | 'REFUND')} />
                <TextField label="Payment/refund amount" value={paymentAmount} inputProps={{ inputMode: 'decimal' }} onChange={(event) => setPaymentAmount(event.target.value)} />
                <TextField label="Receipt/reference" value={reference} onChange={(event) => setReference(event.target.value)} />
              </PlatformFormGrid>
              <Stack direction="row"><AppButton variant="contained" disabled={!allowedAction || !chargeId || !paymentAmount || !reference || !choicesReady} onClick={() => operation.mutate(async () => { await api.payment(firmId, Number(chargeId), { amount: paymentAmount, kind: paymentKind, reference, idempotencyKey: paymentKey, reason }); setPaymentKey(crypto.randomUUID()); setPaymentAmount(''); setReference(''); })}>Record manual payment event</AppButton></Stack>
            </PlatformSection>
            <PlatformSection title="Payment and refund history" description="Events for charges on the current charge-history page.">
              <PlatformTable label="Platform payments" isEmpty={details.data.charges.every((charge) => charge.payments.length === 0)} emptyMessage="No payment events on this page" columns={[{ key: 'charge', label: 'Charge' }, { key: 'event', label: 'Event' }, { key: 'currency', label: 'Currency' }, { key: 'amount', label: 'Amount', align: 'right' }, { key: 'reference', label: 'Receipt / reference' }]}>
                {details.data.charges.flatMap((charge) => charge.payments.map((payment) => <TableRow key={payment.id}><TableCell>#{charge.id}</TableCell><TableCell>{payment.kind}</TableCell><TableCell>{charge.currency}</TableCell><TableCell align="right">{payment.amount}</TableCell><TableCell sx={{ overflowWrap: 'anywhere' }}>{payment.reference}</TableCell></TableRow>))}
              </PlatformTable>
            </PlatformSection>
          </> : null}
          {tab === 'activity' ? <><UsageEventsPanel key={`usage-${firmId}`} firmId={firmId} /><PlatformAuditPanel key={firmId} firmId={firmId} /></> : null}
        </Stack>
      ) : null}
    </Stack>
  );
}
