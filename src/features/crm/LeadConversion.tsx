import { Alert, Checkbox, FormControlLabel, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { PERMISSIONS, useHasPermission } from '@features/auth';
import { toApiError } from '@shared/api/apiClient';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { AppButton } from '@shared/ui/actions';
import { convertLead, crmKeys, crmOptions, leadSuggestions, type CrmRecord } from './crm.api';

export function LeadConversion({ lead, onSaved }: { lead: CrmRecord; onSaved: () => void }) {
  const firmId = useFirmId(); const cache = useQueryClient(); const [search, setSearch] = useState(''); const [create, setCreate] = useState(false); const [confirmed, setConfirmed] = useState(false);
  const canCreate = useHasPermission(PERMISSIONS.COMPANIES_MANAGE); const [key] = useState(() => crypto.randomUUID());
  const suggestions = useQuery({ queryKey: [...crmKeys.firm(firmId), 'suggestions', lead.id], queryFn: ({ signal }) => leadSuggestions(lead.id, signal) });
  const options = useQuery({ queryKey: [...crmKeys.firm(firmId), 'options', search], queryFn: ({ signal }) => crmOptions(search, signal) });
  const mutation = useMutation({ mutationFn: (payload: Record<string, unknown>) => convertLead(lead.id, payload), onSuccess: async () => { await cache.invalidateQueries({ queryKey: crmKeys.firm(firmId) }); await cache.invalidateQueries({ queryKey: ['companies'] }); onSaved(); } });
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const newCompany = { name: String(data.get('name')), isActive: true, contacts: [{ name: lead.name, ...(lead.email ? { email: lead.email } : {}), ...(lead.phone ? { phone: lead.phone } : {}), isPrimary: true }] }; mutation.mutate({ expectedVersion: lead.version, idempotencyKey: key, ...(create ? { newCompany, confirmNewCompany: confirmed } : { companyId: Number(data.get('companyId')) }) }); }
  const companies = [...new Map([...(suggestions.data ?? []), ...(options.data?.companies ?? [])].map((company) => [company.id, company])).values()];
  return <Stack component="form" onSubmit={submit} spacing={2} sx={{ pt: 1 }}>
    <Typography>Review possible matches before linking this prospect to the Company master.</Typography>
    {suggestions.isError || mutation.isError ? <Alert severity="error">{toApiError(mutation.error ?? suggestions.error).message}</Alert> : null}
    <Typography>Suggested matches: {suggestions.data?.map((company) => company.name).join(', ') || 'None found'}</Typography>
    {canCreate ? <FormControlLabel control={<Checkbox checked={create} onChange={(_event, value) => setCreate(value)} />} label="Explicitly create a new company" /> : null}
    {create ? <><TextField name="name" label="New company name" defaultValue={lead.name} required inputProps={{ minLength: 2 }} /><FormControlLabel control={<Checkbox checked={confirmed} onChange={(_event, value) => setConfirmed(value)} />} label="I reviewed matches and confirm this is a new company" /></> : <><TextField label="Search companies" value={search} onChange={(event) => setSearch(event.target.value)} /><TextField select name="companyId" label="Choose existing company" required defaultValue="">{companies.map((company) => <MenuItem key={company.id} value={company.id}>{company.name} (#{company.id})</MenuItem>)}</TextField></>}
    <AppButton type="submit" disabled={mutation.isPending || suggestions.isPending || suggestions.isError || (create && !confirmed)} variant="contained">Convert lead</AppButton>
  </Stack>;
}
