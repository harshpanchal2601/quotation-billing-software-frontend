import { Alert, Box, Checkbox, Chip, FormControlLabel, Stack, Switch, TextField, Typography } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@features/auth';
import { toApiError } from '@shared/api/apiClient';
import { ErrorState } from '@shared/components/common/ErrorState';
import { CommandForm } from '@shared/forms/CommandForm';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { AppButton } from '@shared/ui/actions';
import { DetailFields, DetailSection, PageContainer, PageHeader } from '@shared/ui/layout';
import { assistantApi, type Status } from './assistant.api';

const connectionStates: Record<string, { label: string; description: string }> = {
  CONNECTED: { label: 'Connected', description: 'Your account is connected. Requests use your firm permissions and the limits set by your administrator.' },
  COMMERCIAL_INTEGRATION_REQUIRED: { label: 'Not available yet', description: 'ChatGPT connection is not available in this installation yet. Your platform administrator must complete the integration before accounts can connect.' },
  NOT_CONNECTED: { label: 'Not connected', description: 'No ChatGPT account is connected. Account connection is not available from this screen yet.' },
  RECONNECT_REQUIRED: { label: 'Reconnection needed', description: 'Your previous account connection needs to be restored. Contact your platform administrator.' },
  USAGE_LIMIT_REACHED: { label: 'Account limit reached', description: 'Your connected account has reached its provider usage limit. Local searches remain subject to your firm access.' },
};

export function AssistantSettingsPage() {
  const firmId = useFirmId(); const { user } = useAuth();
  const query = useQuery({ queryKey: ['assistant-settings', firmId, user?.id], queryFn: assistantApi.settings });
  return <PageContainer>
    <PageHeader title="Assistant settings" description="Control how your firm uses the assistant and stores conversations." actions={<AppButton component={Link} to="/assistant" variant="outlined">Open business assistant</AppButton>} />
    {query.isPending ? <Typography role="status">Loading assistant settings…</Typography> : null}
    {query.isError ? <ErrorState message={toApiError(query.error).message} onRetry={() => void query.refetch()} /> : null}
    {query.data ? <SettingsWorkspace key={`${firmId}:${user?.id}:${query.data.settings.version}`} status={query.data} /> : null}
  </PageContainer>;
}
function SettingsWorkspace({ status }: { status: Status }) {
  const cache = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [settings, setSettings] = useState(status.settings); const [consent, setConsent] = useState(false);
  const connectionReady = status.connection === 'CONNECTED';
  const connection = connectionStates[status.connection] ?? { label: 'Unavailable', description: 'Connection status is unavailable. Contact your platform administrator.' };
  const connectedStatus = !status.llmAllowed ? 'Not included in plan' : !status.settings.llmEnabled ? 'Off for this firm' : 'Allowed by firm';
  const clearsStoredContent = status.settings.retainContentDays !== null && settings.retainContentDays === null;
  return <>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'repeat(2, minmax(0, 1fr))' }, gap: 3, alignItems: 'stretch' }}>
      <DetailSection title="Assistant availability" description="Availability is managed by your platform administrator.">
        <DetailFields columns={1} fields={[
          { label: 'Local assistant', value: <Chip size="small" variant="outlined" color={status.localAllowed ? 'success' : 'default'} label={status.localAllowed ? 'Available' : 'Unavailable'} /> },
          { label: 'Connected assistant policy', value: <Chip size="small" variant="outlined" color={connectionReady && status.settings.llmEnabled ? 'success' : 'default'} label={connectedStatus} /> },
          { label: 'Your ChatGPT connection', value: connection.label },
        ]} />
      </DetailSection>
      <DetailSection title="Firm policy" description="Limits and storage settings for your firm." actions={<AppButton variant="outlined" size="small" onClick={() => { setSettings(status.settings); setConsent(false); setEditing(true); }}>Edit policy</AppButton>}>
        <DetailFields columns={1} fields={[
          { label: 'Daily request limit', value: status.settings.dailyLlmRequests === null ? 'Not set' : `${status.settings.dailyLlmRequests.toLocaleString()} per day` },
          { label: 'Conversation content storage', value: status.settings.retainContentDays === null ? 'Off — conversation text is not stored' : `${status.settings.retainContentDays} days` },
          { label: 'Policy version', value: status.settings.version > 0 ? status.settings.version : 'Default settings' },
        ]} />
      </DetailSection>
    </Box>
    <DetailSection title="Connect ChatGPT" description="Each person connects their own account. Connections are never shared with other firm users.">
      <Stack spacing={2} alignItems="flex-start">
        <Alert severity="info" sx={{ width: '100%' }}>{connection.description}</Alert>
        <AppButton disabled variant="outlined" data-oai-siwc-button>{connectionReady ? 'ChatGPT account connected' : 'Connect ChatGPT — not available yet'}</AppButton>
        <Typography variant="body2" color="text.secondary">When connected, relevant request details are sent to OpenAI under the account’s applicable policies. The assistant asks for confirmation before actions that change business records.</Typography>
      </Stack>
    </DetailSection>
    {status.localAllowed ? <Alert severity="success">You can use the local assistant now to search permitted business records. Local searches do not use AI credits.</Alert> : null}
    {editing ? <CommandForm dialog maxWidth="md" initialOpen hideTrigger title="Edit assistant policy" label="Save policy" successMessage="Assistant policy saved." onClosed={() => setEditing(false)}
      isSubmitDisabled={!consent || settings.llmEnabled && settings.dailyLlmRequests === null}
      confirmation={clearsStoredContent ? { title: 'Delete stored conversation content?', description: 'Turning content storage off permanently removes previously stored conversation text for this firm. Required action history and usage records remain available.', label: 'Save policy and delete content', color: 'error' } : undefined}
      submit={() => assistantApi.saveSettings(settings)} saved={() => cache.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).startsWith('assistant') }, { throwOnError: true })}>
      <input type="hidden" name="assistantPolicy" value={JSON.stringify({ ...settings, consent })} />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2, alignItems: 'start' }}>
      <DetailSection title="Connected assistant" description="Allow connected AI use, subject to platform access and an account connection.">
        <Stack spacing={2}>
          <FormControlLabel label="Allow connected assistant for this firm" control={<Switch checked={settings.llmEnabled} disabled={!status.llmAllowed && !settings.llmEnabled} onChange={(_, checked) => { setSettings({ ...settings, llmEnabled: checked }); setConsent(false); }} />} />
          {!status.llmAllowed ? <Alert severity="info">Connected assistant access is managed by your platform administrator.</Alert> : null}
          <TextField name="dailyRequests" type="number" label="Daily request limit" value={settings.dailyLlmRequests ?? ''} required={settings.llmEnabled} inputProps={{ min: 1, max: 1000000, step: 1 }} onChange={(event) => { setSettings({ ...settings, dailyLlmRequests: event.target.value ? Number(event.target.value) : null }); setConsent(false); }} helperText="Shared across your firm. Resets at 05:30 India time (00:00 UTC). Platform and provider limits also apply." />
        </Stack>
      </DetailSection>
      <DetailSection title="Conversation privacy" description="Choose how long to store conversation text.">
        <TextField name="retentionDays" type="number" label="Store conversation text for (days)" value={settings.retainContentDays ?? ''} inputProps={{ min: 1, max: 365, step: 1 }} onChange={(event) => { setSettings({ ...settings, retainContentDays: event.target.value ? Number(event.target.value) : null }); setConsent(false); }} helperText="Leave blank to keep storage off. Enter 1–365 days to retain conversation text. Clearing this deletes previously stored text." />
      </DetailSection>
      </Box>
      <Typography variant="body2" color="text.secondary">Action history and usage records remain available when conversation storage is off.</Typography>
      <FormControlLabel label="I approve these request limits and conversation storage settings." control={<Checkbox checked={consent} onChange={(_, checked) => setConsent(checked)} />} />
    </CommandForm> : null}
  </>;
}
