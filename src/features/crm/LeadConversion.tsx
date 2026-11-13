import { Alert, Checkbox, FormControlLabel, MenuItem, TextField, Typography } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { PERMISSIONS, useHasPermission } from '@features/auth';
import { toApiError } from '@shared/api/apiClient';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { CommandForm } from '@shared/forms/CommandForm';
import { AppButton } from '@shared/ui/actions';
import { convertLead, crmKeys, crmOptions, leadSuggestions, type CrmRecord } from './crm.api';

export function LeadConversion({ lead, onSaved }: { lead: CrmRecord; onSaved: () => void }) {
  const firmId = useFirmId(); const cache = useQueryClient(); const [search, setSearch] = useState(''); const [create, setCreate] = useState(false); const [confirmed, setConfirmed] = useState(false);
  const canCreate = useHasPermission(PERMISSIONS.COMPANIES_MANAGE);
  const suggestions = useQuery({ queryKey: [...crmKeys.firm(firmId), 'suggestions', lead.id], queryFn: ({ signal }) => leadSuggestions(lead.id, signal) });
  const options = useQuery({ queryKey: [...crmKeys.firm(firmId), 'options', search], queryFn: ({ signal }) => crmOptions(search, signal) });
  function submit(data: FormData, key: string) {
    const newCompany = { name: String(data.get('name')), isActive: true, contacts: [{ name: lead.name, ...(lead.email ? { email: lead.email } : {}), ...(lead.phone ? { phone: lead.phone } : {}), isPrimary: true }] };
    return convertLead(lead.id, { expectedVersion: lead.version, idempotencyKey: key, ...(create ? { newCompany, confirmNewCompany: confirmed } : { companyId: Number(data.get('companyId')) }) });
  }
  const companies = [...new Map([...(suggestions.data ?? []), ...(options.data?.companies ?? [])].map((company) => [company.id, company])).values()];
  return <CommandForm dialog initialOpen hideTrigger title="Convert lead" label="Convert lead" isSubmitDisabled={suggestions.isPending || suggestions.isError || (create && (!canCreate || !confirmed))} onClosed={onSaved} successMessage="Lead converted." submit={submit} saved={() => Promise.all([cache.invalidateQueries({ queryKey: crmKeys.firm(firmId) }), cache.invalidateQueries({ queryKey: ['companies'] })])}>
    <Typography>Review possible matches before linking this prospect to the Company master.</Typography>
    {suggestions.isError ? <Alert severity="error">{toApiError(suggestions.error).message}</Alert> : null}
    {options.isError ? <Alert severity="error">{toApiError(options.error).message}</Alert> : null}
    {suggestions.isError || options.isError ? <AppButton onClick={() => { void suggestions.refetch(); void options.refetch(); }}>Retry company matches</AppButton> : null}
    <Typography>Suggested matches: {suggestions.data?.map((company) => company.name).join(', ') || 'None found'}</Typography>
    {canCreate ? <FormControlLabel control={<Checkbox checked={create} onChange={(_event, value) => setCreate(value)} />} label="Explicitly create a new company" /> : null}
    {create ? <><TextField key="new-company" name="name" label="New company name" defaultValue={lead.name} required inputProps={{ minLength: 2 }} /><FormControlLabel control={<Checkbox checked={confirmed} onChange={(_event, value) => setConfirmed(value)} />} label="I reviewed matches and confirm this is a new company" /></> : <><TextField key="company-search" label="Search companies" value={search} onChange={(event) => setSearch(event.target.value)} /><TextField select name="companyId" label="Choose existing company" required defaultValue="">{companies.map((company) => <MenuItem key={company.id} value={company.id}>{company.name} (#{company.id})</MenuItem>)}</TextField></>}
  </CommandForm>;
}
