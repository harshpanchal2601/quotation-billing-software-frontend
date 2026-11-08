import Alert from '@mui/material/Alert';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import type { EffectiveAccess } from '@shared/tenancy/entitlements';
import { subscriptionsApi } from './subscriptions.api';

export function AssistantModeControls({ firmId, access, reason, pending, onChange }: {
  firmId: number; access: EffectiveAccess; reason: string; pending: boolean;
  onChange: (operation: () => Promise<unknown>) => void;
}) {
  const disabled = pending || reason.trim().length < 10;
  return <Stack spacing={1}>
    <Typography variant="h6">Business assistant access</Typography>
    <Typography color="text.secondary">Enable each mode for this firm. Changes use the existing audited platform overrides. Global off switches and subscription status still apply.</Typography>
    {([
      ['assistant.local', 'Local assistant'],
      ['ai.credits', 'Connected LLM assistant'],
    ] as const).map(([key, label]) => {
      const feature = access.features.find((entry) => entry.key === key);
      return <Stack key={key}>
        <FormControlLabel label={label} control={<Switch checked={feature?.allowed === true} disabled={disabled || !feature || feature.reason === 'GLOBAL_HARD_DISABLED' || feature.reason === 'SUBSCRIPTION_UNAVAILABLE' || feature.reason === 'FIRM_UNAVAILABLE'} onChange={(_, enabled) => onChange(() => subscriptionsApi.override(firmId, {
          target: `feature:${key}`, effect: enabled ? 'ALLOW' : 'DENY', limit: null,
          startsAt: new Date().toISOString(), expiresAt: null, reason,
        }))} />} />
        <Typography variant="caption">{feature?.reason.replace(/_/g, ' ') ?? 'Access unavailable'}</Typography>
      </Stack>;
    })}
    <Alert severity="info">LLM access requires each user's own connection and a firm AI credit allowance. Local fallback also requires local access. These switches grant product access; they do not connect an OpenAI account or charge a customer.</Alert>
  </Stack>;
}
