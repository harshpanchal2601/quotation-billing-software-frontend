import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { EffectiveAccess } from '@shared/tenancy/entitlements';
import { formatRecordStatus } from '@shared/ui/display';
import { formatExactDecimal } from '@shared/localization/presentation';
import { DetailFields } from '@shared/ui/layout';
import { RecordTable } from '@shared/ui/tables';

const resourceLabels: Record<string, string> = {
  users: 'Users',
  documents: 'Documents',
  storageBytes: 'File storage (bytes)',
  aiCredits: 'AI credits',
};

function resourceLabel(resource: string) {
  return Object.prototype.hasOwnProperty.call(resourceLabels, resource) ? resourceLabels[resource] : resource;
}

const accessReasons: Record<string, string> = {
  PLAN_INCLUDED: 'Included in your plan',
  PLAN_EXCLUDES_FEATURE: 'Not included in your plan',
  RBAC_DENIED: 'Your role does not allow this feature',
  PLATFORM_ALLOW: 'Enabled for this firm by the platform administrator',
  PLATFORM_DENY: 'Disabled for this firm by the platform administrator',
  GLOBAL_HARD_DISABLED: 'Disabled by the platform administrator',
  FIRM_UNAVAILABLE: 'The firm is inactive or unavailable',
  SUBSCRIPTION_UNAVAILABLE: 'The subscription is not active',
  UNKNOWN_FEATURE: 'This feature is unavailable',
  DEPENDENCY_CYCLE: 'Feature configuration needs administrator review',
};
function accessReason(reason: string, features: EffectiveAccess['features']) {
  if (reason.startsWith('DEPENDENCY:')) {
    const parts = reason.split(':');
    const dependency = features.find((feature) => feature.key === parts[1])?.description ?? 'another feature';
    return `Requires ${dependency}. ${accessReasons[parts.at(-1) ?? ''] ?? 'Ask your administrator to review access.'}`;
  }
  return accessReasons[reason] ?? 'Ask your administrator to review access.';
}
const quotaValue = (value: string) => formatExactDecimal(value, 'en-IN');

export function EffectiveAccessPanel({ access }: { access: EffectiveAccess }) {
  return <Stack spacing={2}>
    <DetailFields fields={[
      { label: 'Plan', value: access.subscription?.planName ?? 'Legacy compatible' },
      { label: 'Status', value: formatRecordStatus(access.subscription?.status ?? 'ACTIVE') },
      ...(access.subscription ? [{ label: 'Revision', value: access.subscription.revision }] : []),
      { label: 'Access checked', value: new Date(access.evaluatedAt).toLocaleString() },
    ]} />
    <Typography variant="body2" color="text.secondary">The current plan revision stays assigned until a new assignment takes effect.</Typography>
    <RecordTable
      label="Usage limits"
      rows={access.quotas}
      rowKey={(quota) => quota.resource}
      emptyMessage="No usage limits are available for this firm."
      columns={[
        { key: 'resource', label: 'Resource', render: (quota) => resourceLabel(quota.resource), sortValue: (quota) => resourceLabel(quota.resource) },
        { key: 'used', label: 'Used', align: 'right', render: (quota) => quota.ready ? quotaValue(quota.used) : 'Usage check pending', sortValue: (quota) => quota.ready ? quota.used : null },
        { key: 'limit', label: 'Limit', align: 'right', render: (quota) => quota.limit === null ? 'Unlimited' : quotaValue(quota.limit), sortValue: (quota) => quota.limit },
        { key: 'remaining', label: 'Remaining', align: 'right', render: (quota) => quota.ready ? quota.remaining === null ? 'Unlimited' : quotaValue(quota.remaining) : 'Unknown', sortValue: (quota) => quota.ready ? quota.remaining : null },
      ]}
    />
    {access.quotas.some((quota) => !quota.ready) ? <Alert severity="info">An administrator must reconcile legacy storage before applying a finite storage limit.</Alert> : null}
    <RecordTable
      label="Feature access"
      rows={access.features}
      rowKey={(feature) => feature.key}
      emptyMessage="No feature access details are available for this firm."
      columns={[
        { key: 'feature', label: 'Feature', render: (feature) => feature.description, sortValue: (feature) => feature.description },
        { key: 'available', label: 'Available to firm', render: (feature) => feature.available ? 'Allowed' : 'Denied', sortValue: (feature) => feature.available },
        { key: 'allowed', label: 'Your access', render: (feature) => feature.allowed ? 'Allowed' : 'Denied', sortValue: (feature) => feature.allowed },
        { key: 'reason', label: 'Explanation', render: (feature) => accessReason(feature.reason, access.features), sortValue: (feature) => accessReason(feature.reason, access.features) },
      ]}
    />
  </Stack>;
}
