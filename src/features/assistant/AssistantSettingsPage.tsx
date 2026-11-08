import Alert from '@mui/material/Alert';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth } from '@features/auth';
import { toApiError } from '@shared/api/apiClient';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { AppButton } from '@shared/ui/actions';
import { PageContainer, PageHeader } from '@shared/ui/layout';
import { assistantApi, type Status } from './assistant.api';

export function AssistantSettingsPage() {
  const firmId = useFirmId(); const { user } = useAuth();
  const query = useQuery({ queryKey: ['assistant-settings', firmId, user?.id], queryFn: assistantApi.settings });
  return <PageContainer><PageHeader title="Assistant settings" description="Manage the assistant policy for your firm. Each user's ChatGPT connection remains personal." />
    {query.isPending ? <Typography role="status">Loading settings…</Typography> : null}
    {query.isError ? <Alert severity="error">{toApiError(query.error).message}</Alert> : null}
    {query.data ? <SettingsEditor key={`${firmId}:${user?.id}:${query.data.settings.version}`} status={query.data} /> : null}
  </PageContainer>;
}
function SettingsEditor({ status }: { status: Status }) {
  const cache = useQueryClient();
  const [settings, setSettings] = useState(status.settings); const [consent, setConsent] = useState(false);
  const save = useMutation({ mutationFn: () => assistantApi.saveSettings(settings), onSuccess: () => cache.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).startsWith('assistant') }) });
  return <Stack spacing={2}>
    <Typography>Platform access: local {status.localAllowed ? 'enabled' : 'disabled'} · LLM {status.llmAllowed ? 'enabled' : 'disabled'}. Your platform administrator controls these grants.</Typography>
    <FormControlLabel label="Allow connected LLM use in this firm" control={<Switch checked={settings.llmEnabled} disabled={!status.llmAllowed && !settings.llmEnabled} onChange={(_, checked) => { setSettings({ ...settings, llmEnabled: checked }); setConsent(false); }} />} />
    <TextField type="number" label="Daily firm LLM request limit" value={settings.dailyLlmRequests ?? ''} inputProps={{ min: 1, max: 1000000 }} onChange={(event) => { setSettings({ ...settings, dailyLlmRequests: event.target.value ? Number(event.target.value) : null }); setConsent(false); }} helperText="Shared across this firm's users, resets at 00:00 UTC. The platform AI allowance and each connected account's provider limit also apply. Local requests use no AI credits." />
    <TextField type="number" label="Store conversation content for this many days" value={settings.retainContentDays ?? ''} inputProps={{ min: 1, max: 365 }} onChange={(event) => { setSettings({ ...settings, retainContentDays: event.target.value ? Number(event.target.value) : null }); setConsent(false); }} helperText="Blank keeps content storage off. Opt-in requires the retention worker. Action audit and usage metadata remain available. Clearing this erases previously retained message content." />
    <Alert severity="info">ChatGPT sign-in for this hosted application needs OpenAI commercial integration approval and a registered client. Connections are unavailable until that integration is approved and configured. A personal ChatGPT account will not be shared with other users.</Alert>
    <AppButton disabled data-oai-siwc-button>Continue with ChatGPT — awaiting platform integration</AppButton>
    <Typography variant="body2">When connected, relevant request context will be sent to OpenAI under the account's applicable policies. The assistant still uses your Bhuminex firm permissions and requires confirmation for every consequential action.</Typography>
    <FormControlLabel label="I approve these firm limits and the selected content-retention policy." control={<Checkbox checked={consent} onChange={(_, checked) => setConsent(checked)} />} />
    {save.isError ? <Alert severity="error">{toApiError(save.error).message}</Alert> : null}
    <AppButton variant="contained" disabled={!consent || settings.llmEnabled && !settings.dailyLlmRequests} isLoading={save.isPending} onClick={() => save.mutate()}>Save assistant policy</AppButton>
  </Stack>;
}
