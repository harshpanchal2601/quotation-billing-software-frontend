import { FormControlLabel, Switch, TextField, Typography } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useAuth } from '@features/auth';
import { toApiError } from '@shared/api/apiClient';
import { ErrorState } from '@shared/components/common/ErrorState';
import { CommandForm } from '@shared/forms/CommandForm';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { AppButton } from '@shared/ui/actions';
import { DetailFields, DetailSection } from '@shared/ui/layout';
import { getPreferences, savePreferences } from '../api/automation.api';
import type { Preference } from '../model/automation.types';

function defaultPreference(): Preference { return { enabled: false, utcOffsetMinutes: -new Date().getTimezoneOffset(), quietStartMinute: null, quietEndMinute: null }; }
function time(value: number | null) { return value === null ? '' : `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`; }
function minutes(value: string) { if (!value) return null; const [hour, minute] = value.split(':').map(Number); return hour! * 60 + minute!; }
function offset(value: number) { const absolute = Math.abs(value); return `UTC${value < 0 ? '−' : '+'}${String(Math.floor(absolute / 60)).padStart(2, '0')}:${String(absolute % 60).padStart(2, '0')}`; }
export function NotificationPreferences() {
  const firmId = useFirmId(); const { user } = useAuth();
  const query = useQuery({ queryKey: ['automation-preferences', firmId, user?.id], queryFn: getPreferences });
  if (query.isPending) return <Typography role="status">Loading notification preferences…</Typography>;
  if (query.isError) return <ErrorState message={toApiError(query.error).message} onRetry={() => void query.refetch()} />;
  return <PreferenceSettings key={`${firmId}:${user?.id}:${JSON.stringify(query.data)}`} preference={query.data ?? defaultPreference()} />;
}
function PreferenceSettings({ preference }: { preference: Preference }) {
  const firmId = useFirmId(); const { user } = useAuth(); const cache = useQueryClient();
  const [editing, setEditing] = useState(false); const [value, setValue] = useState(preference); const savedPreference = useRef<Preference>();
  return <>
    <DetailSection title="Your automation notifications" description="Choose whether to receive notifications within this application and when to pause them."
      actions={<AppButton variant="outlined" size="small" onClick={() => { setValue(preference); setEditing(true); }}>Edit notification preferences</AppButton>}>
      <DetailFields fields={[
        { label: 'Automated notifications', value: preference.enabled ? 'Enabled' : 'Disabled' },
        { label: 'Time zone offset', value: offset(preference.utcOffsetMinutes) },
        { label: 'Quiet hours start', value: time(preference.quietStartMinute) || 'Not set' },
        { label: 'Quiet hours end', value: time(preference.quietEndMinute) || 'Not set' },
      ]} />
    </DetailSection>
    {editing ? <CommandForm dialog initialOpen hideTrigger title="Edit notification preferences" label="Save notification preferences" successMessage="Notification preferences saved." onClosed={() => setEditing(false)}
      submit={async () => { savedPreference.current = await savePreferences(value); }} saved={() => { cache.setQueryData(['automation-preferences', firmId, user?.id], savedPreference.current); }}>
      <input type="hidden" name="notificationPreferences" value={JSON.stringify(value)} />
      <Typography variant="body2">These settings apply to notifications within this application. Choose whether you want to receive automated messages.</Typography>
      <FormControlLabel label="Receive automated notifications in this application" control={<Switch checked={value.enabled} onChange={(_, enabled) => setValue({ ...value, enabled })} />} />
      <TextField label="Time zone offset in minutes" type="number" value={value.utcOffsetMinutes} inputProps={{ min: -720, max: 840, step: 1 }} helperText="India: 330 (UTC+05:30). UTC: 0. Update this if your time zone changes." onChange={(event) => setValue({ ...value, utcOffsetMinutes: Number(event.target.value) })} />
      <TextField label="Quiet hours start" type="time" value={time(value.quietStartMinute)} InputLabelProps={{ shrink: true }} onChange={(event) => setValue({ ...value, quietStartMinute: minutes(event.target.value) })} />
      <TextField label="Quiet hours end" type="time" value={time(value.quietEndMinute)} InputLabelProps={{ shrink: true }} onChange={(event) => setValue({ ...value, quietEndMinute: minutes(event.target.value) })} />
      <AppButton onClick={() => setValue({ ...value, quietStartMinute: null, quietEndMinute: null })}>Clear quiet hours</AppButton>
    </CommandForm> : null}
  </>;
}
