import Alert from '@mui/material/Alert';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toApiError } from '@shared/api/apiClient';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { AppButton } from '@shared/ui/actions';
import { getPreferences, savePreferences } from '../api/automation.api';
import type { Preference } from '../model/automation.types';
import { useAuth } from '@features/auth';

function defaultPreference(): Preference { return { enabled: false, utcOffsetMinutes: -new Date().getTimezoneOffset(), quietStartMinute: null, quietEndMinute: null }; }
function time(value: number | null) { return value === null ? '' : `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`; }
function minutes(value: string) { if (!value) return null; const [hour, minute] = value.split(':').map(Number); return hour! * 60 + minute!; }
export function NotificationPreferences() {
  const firmId = useFirmId(); const { user } = useAuth(); const query = useQuery({ queryKey: ['automation-preferences', firmId, user?.id], queryFn: getPreferences });
  if (query.isPending) return <Typography>Loading notification preferences…</Typography>;
  if (query.isError) return <Alert severity="error">{toApiError(query.error).message}<AppButton onClick={() => void query.refetch()}>Retry</AppButton></Alert>;
  return <PreferenceForm key={`${firmId}:${user?.id}:${JSON.stringify(query.data)}`} preference={query.data ?? defaultPreference()} />;
}
function PreferenceForm({ preference }: { preference: Preference }) {
  const firmId = useFirmId(); const { user } = useAuth(); const cache = useQueryClient(); const [value, setValue] = useState(preference);
  const save = useMutation({ mutationFn: () => savePreferences(value), onSuccess: (saved) => cache.setQueryData(['automation-preferences', firmId, user?.id], saved) });
  return <Stack component="form" spacing={2} onSubmit={(event) => { event.preventDefault(); save.mutate(); }}><Typography variant="h6">Your automation notifications</Typography><Typography variant="body2">In-app only. You must opt in before receiving automated messages.</Typography>
    {save.isError ? <Alert severity="error">{toApiError(save.error).message}</Alert> : null}
    <FormControlLabel label="I consent to in-app automation notifications" control={<Switch checked={value.enabled} onChange={(_, enabled) => setValue({ ...value, enabled })} />} />
    <TextField label="Your UTC offset in minutes" type="number" value={value.utcOffsetMinutes} helperText="For example, India is 330. Update this if your time zone changes." onChange={(event) => setValue({ ...value, utcOffsetMinutes: Number(event.target.value) })} />
    <TextField label="Quiet hours start" type="time" value={time(value.quietStartMinute)} InputLabelProps={{ shrink: true }} onChange={(event) => setValue({ ...value, quietStartMinute: minutes(event.target.value) })} />
    <TextField label="Quiet hours end" type="time" value={time(value.quietEndMinute)} InputLabelProps={{ shrink: true }} onChange={(event) => setValue({ ...value, quietEndMinute: minutes(event.target.value) })} />
    <Stack direction="row" spacing={1}><AppButton type="submit" disabled={save.isPending}>Save notification preferences</AppButton><AppButton onClick={() => setValue({ ...value, quietStartMinute: null, quietEndMinute: null })}>Clear quiet hours</AppButton></Stack>
  </Stack>;
}
