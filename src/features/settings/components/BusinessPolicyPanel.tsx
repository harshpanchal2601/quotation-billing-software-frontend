import Alert from '@mui/material/Alert';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { CommandForm } from '@shared/forms/CommandForm';
import { DetailFields, DetailSection } from '@shared/ui/layout';
import { toApiError } from '@shared/api/apiClient';
import { AppButton } from '@shared/ui/actions';
import { businessPolicyQueryKey, getBusinessPolicyRequest, updateBusinessPolicyRequest, type BusinessPolicy, type BusinessPolicyConfiguration } from '../api/business-policy.api';

const roundingLabels = { HALF_UP: 'Nearest amount — halfway values round up', HALF_EVEN: 'Nearest amount — halfway values round to even', DOWN: 'Drop extra decimal places' };
const totalLabels = { WHOLE_UNIT: 'Whole currency unit (for example 100)', MINOR_UNIT: 'Smallest currency unit (for example 100.25)' };
const presentationLabels = { 'en-IN': 'English (India)', 'en-US': 'English (United States)', 'en-GB': 'English (United Kingdom)', 'hi-IN': 'हिन्दी (भारत)', 'gu-IN': 'ગુજરાતી (ભારત)' };
const salesLabels = { SERVICE: 'Services — direct invoicing', TRADING: 'Trading — order and delivery', MANUFACTURING: 'Manufacturing — order and production delivery', MIXED: 'Mixed goods and services' };

export function BusinessPolicyPanel() {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const query = useQuery({ queryKey: businessPolicyQueryKey, queryFn: getBusinessPolicyRequest, enabled: expanded, staleTime: Infinity });
  const config = query.data;
  return <DetailSection title="Financial policy defaults" description="Configure defaults for new financial workflows. Quotations keep their existing calculation rules and currency setting." actions={<><AppButton variant="outlined" disabled={editing} onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>{expanded ? 'Close financial policies' : 'Configure financial policies'}</AppButton>{expanded && config ? <AppButton variant="outlined" disabled={editing || query.isFetching} onClick={() => setEditing(true)}>Edit financial policies</AppButton> : null}</>}>
    {expanded && query.isPending ? <Typography role="status">Loading financial policies…</Typography> : null}
    {expanded && query.isError ? <Alert severity="error" action={<AppButton onClick={() => void query.refetch()}>Retry</AppButton>}>{toApiError(query.error).message}</Alert> : null}
    {expanded && config ? <Stack spacing={2}>
      <Typography variant="body2">Policy version {config.version}. These preferences are separate from subscription access and user permissions.</Typography>
      <DetailFields fields={[
        { label: 'Financial workflow currency', value: config.policy.currency },
        { label: 'Amount rounding', value: roundingLabels[config.policy.rounding] },
        { label: 'Grand total precision', value: totalLabels[config.policy.grandTotal] },
        { label: 'Tax policy', value: config.policy.tax.id === 'none' ? 'No tax' : `${config.policy.tax.mode === 'IGST' ? 'India GST — IGST' : 'India GST — CGST and SGST'} (${config.policy.tax.rate}%)` },
        { label: 'In-app notifications', value: config.policy.inAppNotifications ? 'On' : 'Off' },
        { label: 'Document presentation locale', value: presentationLabels[config.policy.presentation?.locale ?? 'en-IN'] },
        { label: 'Time zone', value: config.policy.presentation?.timezone ?? 'Asia/Kolkata' },
        { label: 'Sales business', value: salesLabels[config.policy.sales?.preset ?? 'MIXED'] },
        { label: 'Sales orders and completion records', value: config.policy.sales?.ordersEnabled === false ? 'Off' : 'On' },
        { label: 'Customer portal', value: config.policy.sales?.portalEnabled === false ? 'Off' : 'On' },
      ]} />
    </Stack> : null}
    {editing && config ? <BusinessPolicyForm configuration={config} onClosed={() => { setEditing(false); void query.refetch(); }} /> : null}
  </DetailSection>;
}

function BusinessPolicyForm({ configuration, onClosed }: { configuration: BusinessPolicyConfiguration; onClosed: () => void }) {
  const baseline = useRef(configuration).current;
  const [policy, setPolicy] = useState<BusinessPolicy>(baseline.policy);
  const cache = useQueryClient();
  const dirty = JSON.stringify(policy) !== JSON.stringify(baseline.policy);
  const sales = policy.sales ?? { preset: 'MIXED' as const, ordersEnabled: true, portalEnabled: true };
  const presentation = policy.presentation ?? { language: 'en' as const, locale: 'en-IN' as const, timezone: 'Asia/Kolkata' };
  const validRate = policy.tax.id === 'none' || /^(?:100(?:\.00?)?|\d{1,2}(?:\.\d{1,2})?)$/.test(policy.tax.rate);
  return (
    <CommandForm dialog initialOpen hideTrigger maxWidth="md" title="Edit financial policies" label="Save financial policies" isSubmitDisabled={!dirty || !validRate} successMessage="Financial policies saved." onClosed={onClosed} confirmation={{ title: 'Save financial policies?', label: 'Confirm and save', description: `Save these defaults using policy version ${baseline.version}. New financial workflows will use them. Issued documents and quotation calculation rules keep their saved values.` }} submit={async (data) => {
      const saved = await updateBusinessPolicyRequest({ expectedVersion: baseline.version, policy: JSON.parse(String(data.get('policy'))) as BusinessPolicy });
      cache.setQueryData(businessPolicyQueryKey, saved);
    }} saved={() => undefined}>
      <input type="hidden" name="policy" value={JSON.stringify(policy)} />
      <Typography variant="body2">Policy version {baseline.version}. These preferences are separate from subscription access and user permissions.</Typography>
      <TextField select label="Financial workflow currency" value={policy.currency} onChange={(event) => setPolicy({ ...policy, currency: event.target.value as BusinessPolicy['currency'] })}>
        {['INR', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'JPY', 'KWD', 'BHD'].map((currency) => <MenuItem key={currency} value={currency} disabled={policy.tax.id === 'india-gst' && currency !== 'INR'}>{currency}</MenuItem>)}
      </TextField>
      <TextField select label="Amount rounding" value={policy.rounding} onChange={(event) => setPolicy({ ...policy, rounding: event.target.value as BusinessPolicy['rounding'] })}>
        {Object.entries(roundingLabels).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
      </TextField>
      <TextField select label="Grand total precision" value={policy.grandTotal} onChange={(event) => setPolicy({ ...policy, grandTotal: event.target.value as BusinessPolicy['grandTotal'] })}>
        {Object.entries(totalLabels).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
      </TextField>
      <TextField select label="Tax policy" value={policy.tax.id === 'none' ? 'none' : policy.tax.mode} onChange={(event) => setPolicy({ ...policy, tax: event.target.value === 'none' ? { id: 'none', version: 1 } : { id: 'india-gst', version: 1, country: 'IN', mode: event.target.value as 'CGST_SGST' | 'IGST', rate: policy.tax.id === 'india-gst' ? policy.tax.rate : '0.00' } })} helperText="Select the tax treatment confirmed for your legal entity and supply. Other jurisdictions are unsupported.">
        <MenuItem value="none">No tax</MenuItem><MenuItem value="CGST_SGST" disabled={policy.currency !== 'INR'}>India GST — CGST and SGST</MenuItem><MenuItem value="IGST" disabled={policy.currency !== 'INR'}>India GST — IGST</MenuItem>
      </TextField>
      {policy.tax.id === 'india-gst' ? <TextField label="Default GST percentage" value={policy.tax.rate} error={!validRate} helperText={!validRate ? 'Enter 0 to 100 with up to two decimal places.' : 'The owning document records its confirmed rate.'} onChange={(event) => { if (policy.tax.id === 'india-gst') setPolicy({ ...policy, tax: { ...policy.tax, rate: event.target.value } }); }} /> : null}
      <FormControlLabel label="In-app notifications" control={<Switch checked={policy.inAppNotifications} onChange={(_, checked) => setPolicy({ ...policy, inAppNotifications: checked })} />} />
      <Typography variant="body2">Presentation choices apply to new issue snapshots. Existing legal dates, amounts, currency and tax meanings are preserved. Legal document wording remains English.</Typography>
      <TextField select label="Document presentation locale" value={presentation.locale} onChange={(event) => { const locale = event.target.value as typeof presentation.locale; setPolicy({ ...policy, presentation: { ...presentation, locale, language: locale.startsWith('hi') ? 'hi' : locale.startsWith('gu') ? 'gu' : 'en' } }); }}>
        {Object.entries(presentationLabels).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
      </TextField>
      <TextField label="Time zone" value={presentation.timezone} onChange={(event) => setPolicy({ ...policy, presentation: { ...presentation, timezone: event.target.value } })} helperText="For dates with a time, for example Asia/Kolkata. Indian document dates keep their existing calendar rules." />
      <TextField select label="Sales business preset" value={sales.preset} onChange={(event) => { const preset = event.target.value as typeof sales.preset; setPolicy({ ...policy, sales: { preset, ordersEnabled: preset !== 'SERVICE', portalEnabled: true } }); }}><MenuItem value="SERVICE">Services — direct invoicing</MenuItem><MenuItem value="TRADING">Trading — order and delivery</MenuItem><MenuItem value="MANUFACTURING">Manufacturing — order and production delivery</MenuItem><MenuItem value="MIXED">Mixed goods and services</MenuItem></TextField>
      <FormControlLabel label="Sales orders and completion records" control={<Switch checked={sales.ordersEnabled} onChange={(_, checked) => setPolicy({ ...policy, sales: { ...sales, ordersEnabled: checked } })} />} />
      <FormControlLabel label="Customer portal" control={<Switch checked={sales.portalEnabled} onChange={(_, checked) => setPolicy({ ...policy, sales: { ...sales, portalEnabled: checked } })} />} />
    </CommandForm>
  );
}
