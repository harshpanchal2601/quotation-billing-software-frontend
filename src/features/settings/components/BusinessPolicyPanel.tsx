import Alert from '@mui/material/Alert';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { toApiError } from '@shared/api/apiClient';
import { AppButton } from '@shared/ui/actions';
import { businessPolicyQueryKey, getBusinessPolicyRequest, updateBusinessPolicyRequest, type BusinessPolicy, type BusinessPolicyConfiguration } from '../api/business-policy.api';
import { SettingsSection } from './SettingsSection';

export function BusinessPolicyPanel() {
  const [expanded, setExpanded] = useState(false);
  const query = useQuery({ queryKey: businessPolicyQueryKey, queryFn: getBusinessPolicyRequest, enabled: expanded, staleTime: Infinity });
  return (
    <SettingsSection title="Financial policy defaults">
      <Stack spacing={2}>
        <Typography>Configure defaults for new financial workflows. Quotations keep their existing calculation rules and currency setting.</Typography>
        <AppButton variant="outlined" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>{expanded ? 'Close financial policies' : 'Configure financial policies'}</AppButton>
        {expanded && query.isPending ? <Typography role="status">Loading financial policies…</Typography> : null}
        {expanded && query.isError ? <Alert severity="error" action={<AppButton onClick={() => void query.refetch()}>Retry</AppButton>}>{toApiError(query.error).message}</Alert> : null}
        {query.data ? <div hidden={!expanded}><BusinessPolicyForm key={query.data.version} configuration={query.data} reload={() => void query.refetch()} /></div> : null}
      </Stack>
    </SettingsSection>
  );
}

function BusinessPolicyForm({ configuration, reload }: { configuration: BusinessPolicyConfiguration; reload: () => void }) {
  const [policy, setPolicy] = useState<BusinessPolicy>(configuration.policy);
  const cache = useQueryClient();
  const mutation = useMutation({ mutationFn: updateBusinessPolicyRequest,
    onSuccess: (saved) => cache.setQueryData(businessPolicyQueryKey, saved),
  });
  const dirty = JSON.stringify(policy) !== JSON.stringify(configuration.policy);
  const sales = policy.sales ?? { preset: 'MIXED' as const, ordersEnabled: true, portalEnabled: true };
  const presentation = policy.presentation ?? { language: 'en' as const, locale: 'en-IN' as const, timezone: 'Asia/Kolkata' };
  const validRate = policy.tax.id === 'none' || /^(?:100(?:\.00?)?|\d{1,2}(?:\.\d{1,2})?)$/.test(policy.tax.rate);
  const error = mutation.isError ? toApiError(mutation.error) : null;
  return (
    <Stack component="form" spacing={2} onSubmit={(event) => {
      event.preventDefault();
      if (dirty && validRate) mutation.mutate({ expectedVersion: configuration.version, policy });
    }}>
      <Typography variant="body2">Policy version {configuration.version}. These preferences are separate from subscription access and user permissions.</Typography>
      {error ? <Alert severity="error" action={error.isConflict ? <AppButton onClick={reload}>Reload policy</AppButton> : undefined}>{error.message}</Alert> : null}
      <TextField select label="Financial workflow currency" value={policy.currency} disabled={mutation.isPending} onChange={(event) => setPolicy({ ...policy, currency: event.target.value as BusinessPolicy['currency'] })}>
        {['INR', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'JPY', 'KWD', 'BHD'].map((currency) => <MenuItem key={currency} value={currency} disabled={policy.tax.id === 'india-gst' && currency !== 'INR'}>{currency}</MenuItem>)}
      </TextField>
      <TextField select label="Amount rounding" value={policy.rounding} disabled={mutation.isPending} onChange={(event) => setPolicy({ ...policy, rounding: event.target.value as BusinessPolicy['rounding'] })}>
        <MenuItem value="HALF_UP">Half up</MenuItem><MenuItem value="HALF_EVEN">Half even</MenuItem><MenuItem value="DOWN">Toward zero</MenuItem>
      </TextField>
      <TextField select label="Grand total precision" value={policy.grandTotal} disabled={mutation.isPending} onChange={(event) => setPolicy({ ...policy, grandTotal: event.target.value as BusinessPolicy['grandTotal'] })}>
        <MenuItem value="WHOLE_UNIT">Whole currency unit</MenuItem><MenuItem value="MINOR_UNIT">Currency minor unit</MenuItem>
      </TextField>
      <TextField select label="Tax policy" value={policy.tax.id === 'none' ? 'none' : policy.tax.mode} disabled={mutation.isPending} onChange={(event) => setPolicy({ ...policy, tax: event.target.value === 'none' ? { id: 'none', version: 1 } : { id: 'india-gst', version: 1, country: 'IN', mode: event.target.value as 'CGST_SGST' | 'IGST', rate: policy.tax.id === 'india-gst' ? policy.tax.rate : '0.00' } })} helperText="Select the tax treatment confirmed for your legal entity and supply. Other jurisdictions are unsupported.">
        <MenuItem value="none">No tax</MenuItem><MenuItem value="CGST_SGST" disabled={policy.currency !== 'INR'}>India GST — CGST and SGST</MenuItem><MenuItem value="IGST" disabled={policy.currency !== 'INR'}>India GST — IGST</MenuItem>
      </TextField>
      {policy.tax.id === 'india-gst' ? <TextField label="Default GST percentage" value={policy.tax.rate} error={!validRate} helperText={!validRate ? 'Enter 0 to 100 with up to two decimal places.' : 'The owning document records its confirmed rate.'} disabled={mutation.isPending} onChange={(event) => { if (policy.tax.id === 'india-gst') setPolicy({ ...policy, tax: { ...policy.tax, rate: event.target.value } }); }} /> : null}
      <FormControlLabel label="In-app notifications" control={<Switch checked={policy.inAppNotifications} disabled={mutation.isPending} onChange={(_, checked) => setPolicy({ ...policy, inAppNotifications: checked })} />} />
      <Typography variant="body2">Presentation choices apply to new issue snapshots. Existing legal dates, amounts, currency and tax meanings are preserved. Legal document wording remains English.</Typography>
      <TextField select label="Document presentation locale" value={presentation.locale} disabled={mutation.isPending} onChange={(event) => { const locale = event.target.value as typeof presentation.locale; setPolicy({ ...policy, presentation: { ...presentation, locale, language: locale.startsWith('hi') ? 'hi' : locale.startsWith('gu') ? 'gu' : 'en' } }); }}>
        <MenuItem value="en-IN">English (India)</MenuItem><MenuItem value="en-US">English (United States)</MenuItem><MenuItem value="en-GB">English (United Kingdom)</MenuItem><MenuItem value="hi-IN">हिन्दी (भारत)</MenuItem><MenuItem value="gu-IN">ગુજરાતી (ભારત)</MenuItem>
      </TextField>
      <TextField label="Presentation IANA timezone" value={presentation.timezone} disabled={mutation.isPending} onChange={(event) => setPolicy({ ...policy, presentation: { ...presentation, timezone: event.target.value } })} helperText="For timestamp presentation only. India fiscal issuance and date-only values retain their established calendar rules." />
      <TextField select label="Sales business preset" value={sales.preset} disabled={mutation.isPending} onChange={(event) => { const preset = event.target.value as typeof sales.preset; setPolicy({ ...policy, sales: { preset, ordersEnabled: preset !== 'SERVICE', portalEnabled: true } }); }}><MenuItem value="SERVICE">Services — direct invoicing</MenuItem><MenuItem value="TRADING">Trading — order and delivery</MenuItem><MenuItem value="MANUFACTURING">Manufacturing — order and production delivery</MenuItem><MenuItem value="MIXED">Mixed goods and services</MenuItem></TextField>
      <FormControlLabel label="Sales orders and completion records" control={<Switch checked={sales.ordersEnabled} disabled={mutation.isPending} onChange={(_, checked) => setPolicy({ ...policy, sales: { ...sales, ordersEnabled: checked } })} />} />
      <FormControlLabel label="Customer portal" control={<Switch checked={sales.portalEnabled} disabled={mutation.isPending} onChange={(_, checked) => setPolicy({ ...policy, sales: { ...sales, portalEnabled: checked } })} />} />
      <Stack direction="row" spacing={1}>
        <AppButton type="submit" disabled={!dirty || !validRate || mutation.isPending}>Save financial policies</AppButton>
        <AppButton variant="outlined" disabled={!dirty || mutation.isPending} onClick={() => setPolicy(configuration.policy)}>Reset policy changes</AppButton>
      </Stack>
    </Stack>
  );
}
