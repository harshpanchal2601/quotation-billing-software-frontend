import Alert from '@mui/material/Alert';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { PERMISSIONS, useHasPermission } from '@features/auth';
import { toApiError } from '@shared/api/apiClient';
import { ErrorState } from '@shared/components/common/ErrorState';
import { FullPageLoader } from '@shared/components/common/FullPageLoader';
import { AppButton } from '@shared/ui/actions';
import { PageContainer, PageHeader } from '@shared/ui/layout';
import { getBillingSettings, saveBillingSettings, saveInvoiceFields } from '../api/invoices.api';
import { invoicesQueryKeys, useBillingFirmId } from '../model/invoices.query-keys';
import type { BillingKind, CustomField, SettingsResponse } from '../model/invoices.types';

export function BillingSettingsPage() {
  const firmId = useBillingFirmId();
  const settings = useQuery({ queryKey: invoicesQueryKeys.settings(firmId), queryFn: ({ signal }) => getBillingSettings(signal), refetchOnWindowFocus: false });
  if (settings.isPending) return <FullPageLoader />;
  if (settings.isError) return <ErrorState message={toApiError(settings.error).message} onRetry={() => { void settings.refetch(); }} />;
  return <BillingSettingsEditor key={`${firmId}:${settings.data.version}`} initial={settings.data} />;
}
function BillingSettingsEditor({ initial }: { initial: SettingsResponse }) {
  const firmId = useBillingFirmId(); const client = useQueryClient();
  const canFiscal = useHasPermission(PERMISSIONS.BILLING_SETTINGS_MANAGE); const canFields = useHasPermission(PERMISSIONS.INVOICE_FIELDS_MANAGE); const canRoles = useHasPermission(PERMISSIONS.ROLES_MANAGE);
  const [config, setConfig] = useState(initial.config); const [fields, setFields] = useState(initial.config.customFields);
  const [fiscalDirty, setFiscalDirty] = useState(false); const [fieldsDirty, setFieldsDirty] = useState(false);
  const saved = () => { void client.invalidateQueries({ queryKey: invoicesQueryKeys.settings(firmId) }); };
  const fiscal = useMutation({ mutationFn: () => { const { customFields: _, ...values } = config; return saveBillingSettings(initial.version, values); }, onSuccess: saved });
  const custom = useMutation({ mutationFn: () => saveInvoiceFields(initial.version, fields), onSuccess: saved });
  const pending = fiscal.isPending || custom.isPending;
  function editField(index: number, patch: Partial<CustomField>) { setFields(fields.map((field, i) => i === index ? { ...field, ...patch } : field)); setFieldsDirty(true); }
  function reorder(index: number, direction: -1 | 1) { const next = [...fields]; const target = index + direction; if (target < 0 || target >= next.length) return; [next[index], next[target]] = [next[target], next[index]]; setFields(next); setFieldsDirty(true); }
  function saveFields(event: FormEvent) { event.preventDefault(); custom.mutate(); }
  return <PageContainer><PageHeader title="Billing Configuration" description="Configure invoice defaults and additional fields for your firm." />
    {custom.isError || fiscal.isError ? <Alert severity="error">{toApiError(custom.error ?? fiscal.error).message}</Alert> : null}
    <Alert severity="info">Firm admins manage fiscal settings. An admin can delegate custom-field design through Roles & Access. Invoice entry permissions let users fill approved fields; they do not permit changing the field definitions.{canRoles ? <> <Link to="/administration/roles">Manage roles</Link></> : null}</Alert>
    {initial.fieldsManagedByAutomation ? <Alert severity="info">Invoice fields use published versions. A firm administrator can manage them in <Link to="/settings/automation">Automation Settings</Link>.</Alert> : null}
    {canFields && !initial.fieldsManagedByAutomation ? <Stack component="form" onSubmit={saveFields} spacing={2}><Typography variant="h5">Custom fields</Typography><Typography>Use stable keys to identify fields. Reorder fields, adjust labels and widths, select field types and choose which appear on PDFs. Issued documents retain their original definitions and values. Existing drafts can explicitly review and adopt a newer configuration.</Typography>
      {fields.map((field, index) => <Paper key={index} variant="outlined" sx={{ p: 2 }}><Stack spacing={2}><Stack direction="row" spacing={1} alignItems="center"><Typography fontWeight={700}>Field {index + 1}</Typography><AppButton disabled={index === 0} onClick={() => reorder(index, -1)}>Move up</AppButton><AppButton disabled={index === fields.length - 1} onClick={() => reorder(index, 1)}>Move down</AppButton><AppButton color="error" onClick={() => { setFields(fields.filter((_, i) => i !== index)); setFieldsDirty(true); }}>Remove field</AppButton></Stack>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}><TextField required fullWidth label="Field label" value={field.label} inputProps={{ maxLength: 100 }} onChange={(event) => editField(index, { label: event.target.value })} /><TextField required fullWidth label="Stable field key" value={field.key} inputProps={{ pattern: 'cf_[a-z][a-z0-9_]{0,44}', maxLength: 48 }} helperText="Start with cf_, for example cf_purchase_order" onChange={(event) => editField(index, { key: event.target.value })} /><TextField select label="Field type" value={field.type} sx={{ minWidth: 150 }} onChange={(event) => editField(index, { type: event.target.value as CustomField['type'], options: event.target.value === 'SELECT' ? ['Option 1'] : [] })}>{[['TEXT', 'Text'], ['NUMBER', 'Number'], ['DATE', 'Date'], ['BOOLEAN', 'Checkbox'], ['SELECT', 'Selection']].map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}</TextField><TextField select label="Width" value={field.width} sx={{ minWidth: 140 }} onChange={(event) => editField(index, { width: event.target.value as CustomField['width'] })}><MenuItem value="FULL">Full row</MenuItem><MenuItem value="HALF">Half row</MenuItem></TextField></Stack>
      {field.type === 'SELECT' ? <TextField required multiline label="Options, one per line" value={field.options.join('\n')} onChange={(event) => editField(index, { options: event.target.value.split('\n') })} /> : null}
      <Stack direction="row" spacing={2}><FormControlLabel control={<Checkbox checked={field.required} onChange={(event) => editField(index, { required: event.target.checked })} />} label="Required before issuance" /><FormControlLabel control={<Checkbox checked={field.showOnPdf} onChange={(event) => editField(index, { showOnPdf: event.target.checked })} />} label="Show on PDF" /></Stack></Stack></Paper>)}
      <Stack direction="row" spacing={2}><AppButton disabled={fields.length >= 50 || pending} onClick={() => { setFields([...fields, { key: `cf_field_${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`, label: '', type: 'TEXT', required: false, showOnPdf: true, width: 'HALF', options: [] }]); setFieldsDirty(true); }}>Add custom field</AppButton><AppButton type="submit" variant="contained" disabled={!fieldsDirty || pending || fiscalDirty} isLoading={custom.isPending}>Save custom fields</AppButton></Stack>{fiscalDirty && fieldsDirty ? <Alert severity="info">Save or reload the fiscal changes separately before saving field changes.</Alert> : null}
    </Stack> : null}
    {canFiscal ? <Stack component="form" spacing={2} onSubmit={(event: FormEvent) => { event.preventDefault(); fiscal.mutate(); }}><Typography variant="h5">Fiscal and presentation defaults</Typography><Alert severity="info">Choose e-invoice applicability based on your registration and turnover obligations. IRN-required registered supplies cannot be issued until the e-invoice provider is integrated.</Alert>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}><TextField select fullWidth label="Registration type" value={config.registration} onChange={(event) => { setConfig({ ...config, registration: event.target.value as typeof config.registration }); setFiscalDirty(true); }}>{[['UNCONFIGURED', 'Not configured'], ['REGULAR', 'Regular GST registration'], ['COMPOSITION', 'Composition — bill of supply'], ['UNREGISTERED', 'Unregistered — no GST collected']].map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}</TextField><TextField select fullWidth required label="Supplier registration state" value={config.sellerStateCode ?? ''} onChange={(event) => { setConfig({ ...config, sellerStateCode: event.target.value }); setFiscalDirty(true); }}>{Object.entries(initial.states).map(([code, name]) => <MenuItem key={code} value={code}>{code} — {name}</MenuItem>)}</TextField><TextField select fullWidth required label="E-invoice obligations apply" value={config.einvoiceRequired === null ? '' : String(config.einvoiceRequired)} onChange={(event) => { setConfig({ ...config, einvoiceRequired: event.target.value === 'true' }); setFiscalDirty(true); }}><MenuItem value="true">Yes</MenuItem><MenuItem value="false">No</MenuItem></TextField></Stack>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>{Object.entries(config.prefixes).map(([kind, value]) => <TextField key={kind} required label={`${kind.replace(/_/g, ' ')} prefix`} value={value} inputProps={{ pattern: '[A-Z0-9]{1,4}', maxLength: 4 }} onChange={(event) => { setConfig({ ...config, prefixes: { ...config.prefixes, [kind as BillingKind]: event.target.value.toUpperCase() } }); setFiscalDirty(true); }} />)}</Stack><Typography variant="body2">Separate financial-year series use PREFIX/YYZZ/000001. Numbers are assigned transactionally and are never reused after a void.</Typography>
      <Stack direction="row" spacing={2}><TextField select label="PDF template" value={config.template} sx={{ minWidth: 180 }} onChange={(event) => { setConfig({ ...config, template: event.target.value as typeof config.template }); setFiscalDirty(true); }}><MenuItem value="STANDARD">Standard</MenuItem><MenuItem value="COMPACT">Compact</MenuItem></TextField><TextField type="color" label="Accent colour" InputLabelProps={{ shrink: true }} value={config.primaryColour} onChange={(event) => { setConfig({ ...config, primaryColour: event.target.value }); setFiscalDirty(true); }} /></Stack>
      <TextField multiline minRows={2} label="Default payment instructions" value={config.paymentInstructions} onChange={(event) => { setConfig({ ...config, paymentInstructions: event.target.value }); setFiscalDirty(true); }} /><TextField multiline minRows={3} label="Default terms and conditions" value={config.termsAndConditions} onChange={(event) => { setConfig({ ...config, termsAndConditions: event.target.value }); setFiscalDirty(true); }} /><AppButton type="submit" variant="contained" disabled={!fiscalDirty || pending} isLoading={fiscal.isPending}>Save fiscal defaults</AppButton>
    </Stack> : null}
  </PageContainer>;
}
