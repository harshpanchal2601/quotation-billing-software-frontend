import Alert from '@mui/material/Alert';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import MuiLink from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { PERMISSIONS, useAuth, useHasPermission } from '@features/auth';
import { toApiError } from '@shared/api/apiClient';
import { ErrorState } from '@shared/components/common/ErrorState';
import { FullPageLoader } from '@shared/components/common/FullPageLoader';
import { CommandForm } from '@shared/forms/CommandForm';
import { paths } from '@shared/routing/paths';
import { AppButton } from '@shared/ui/actions';
import { formatRecordStatus } from '@shared/ui/display';
import { DetailFields, DetailSection, PageContainer, PageHeader } from '@shared/ui/layout';
import { RecordTable } from '@shared/ui/tables';
import { getBillingSettings, saveBillingSettings, saveInvoiceFields } from '../api/invoices.api';
import { invoicesQueryKeys, useBillingFirmId } from '../model/invoices.query-keys';
import type { BillingKind, BillingSettings, CustomField, SettingsResponse } from '../model/invoices.types';

const registrations: Record<BillingSettings['registration'], string> = { UNCONFIGURED: 'Not configured', REGULAR: 'Regular GST registration', COMPOSITION: 'Composition — bill of supply', UNREGISTERED: 'Unregistered — no GST collected' };
const fieldTypes: Record<CustomField['type'], string> = { TEXT: 'Text', NUMBER: 'Number', DATE: 'Date', BOOLEAN: 'Checkbox', SELECT: 'Selection' };
type EditorMode = 'fields' | 'defaults';

export function BillingSettingsPage() {
  const firmId = useBillingFirmId(); const { user } = useAuth();
  return <BillingSettingsWorkspace key={`${firmId}:${user?.id}`} />;
}
function BillingSettingsWorkspace() {
  const firmId = useBillingFirmId(); const [editing, setEditing] = useState<EditorMode | null>(null);
  const settings = useQuery({ queryKey: invoicesQueryKeys.settings(firmId), queryFn: ({ signal }) => getBillingSettings(signal), refetchOnWindowFocus: false });
  const canFiscal = useHasPermission(PERMISSIONS.BILLING_SETTINGS_MANAGE); const canFields = useHasPermission(PERMISSIONS.INVOICE_FIELDS_MANAGE); const canRoles = useHasPermission(PERMISSIONS.ROLES_MANAGE); const canAutomation = useHasPermission(PERMISSIONS.AUTOMATION_MANAGE);
  const initial = settings.data;
  return <PageContainer><PageHeader title="Billing Configuration" description="Review invoice defaults and additional fields for your firm." />
    {settings.isPending ? <FullPageLoader /> : settings.isError ? <ErrorState message={toApiError(settings.error).message} onRetry={() => void settings.refetch()} /> : initial ? <>
      <Typography color="text.secondary">Settings version {initial.version}. Issued documents keep the settings and field values recorded when they were issued.</Typography>
      {canRoles ? <Typography variant="body2">Use <MuiLink component={Link} to={paths.firmRoles}>Roles & Access</MuiLink> to choose who may change billing defaults and additional fields.</Typography> : null}
      <DetailSection title="Additional invoice fields" description="Fields your team can fill when preparing an invoice. Existing drafts can review a newer field configuration before adopting it." actions={canFields && !initial.fieldsManagedByAutomation ? <AppButton variant="outlined" disabled={editing !== null || settings.isFetching} onClick={() => setEditing('fields')}>Edit invoice fields</AppButton> : null}>
        {initial.fieldsManagedByAutomation ? <Alert severity="info">Invoice fields use published versions. {canAutomation ? <>Manage them in <MuiLink component={Link} to={paths.automation}>Automation Settings</MuiLink>.</> : 'Ask your firm administrator to update them.'}</Alert> : null}
        <RecordTable label="Additional invoice fields" rows={initial.config.customFields} rowKey={(field) => field.key} emptyMessage="No additional fields are configured for invoices." columns={[
          { key: 'label', label: 'Field', render: (field) => field.label, sortValue: (field) => field.label },
          { key: 'type', label: 'Type', render: (field) => fieldTypes[field.type], sortValue: (field) => fieldTypes[field.type] },
          { key: 'required', label: 'Required before issue', render: (field) => field.required ? 'Yes' : 'No', sortValue: (field) => field.required },
          { key: 'pdf', label: 'Shown on PDF', render: (field) => field.showOnPdf ? 'Yes' : 'No', sortValue: (field) => field.showOnPdf },
          { key: 'width', label: 'Width', render: (field) => field.width === 'FULL' ? 'Full row' : 'Half row', sortValue: (field) => field.width },
        ]} />
      </DetailSection>
      {canFiscal ? <DetailSection title="Tax and document defaults" description="Defaults used when preparing new billing documents." actions={<AppButton variant="outlined" disabled={editing !== null || settings.isFetching} onClick={() => setEditing('defaults')}>Edit tax and document defaults</AppButton>}>
        <DetailFields fields={[
          { label: 'Registration type', value: registrations[initial.config.registration] },
          { label: 'Supplier registration state', value: initial.config.sellerStateCode ? `${initial.states[initial.config.sellerStateCode] ?? initial.config.sellerStateCode} (${initial.config.sellerStateCode})` : 'Not configured' },
          { label: 'E-invoice obligations apply', value: initial.config.einvoiceRequired === null ? 'Not configured' : initial.config.einvoiceRequired ? 'Yes' : 'No' },
          ...Object.entries(initial.config.prefixes).map(([kind, value]) => ({ label: `${formatRecordStatus(kind)} prefix`, value })),
          { label: 'PDF template', value: formatRecordStatus(initial.config.template) },
          { label: 'Accent colour', value: initial.config.primaryColour },
          { label: 'Default payment instructions', value: initial.config.paymentInstructions || 'Not set' },
          { label: 'Default terms and conditions', value: initial.config.termsAndConditions || 'Not set' },
        ]} />
      </DetailSection> : null}
      {editing && (editing === 'fields' ? canFields && !initial.fieldsManagedByAutomation : canFiscal) ? <BillingSettingsEditor mode={editing} initial={initial} onClosed={() => setEditing(null)} /> : null}
    </> : null}
  </PageContainer>;
}

function BillingSettingsEditor({ initial, mode, onClosed }: { initial: SettingsResponse; mode: EditorMode; onClosed: () => void }) {
  const firmId = useBillingFirmId(); const client = useQueryClient(); const baseline = useRef(initial).current; const expectedVersion = baseline.version;
  const [config, setConfig] = useState(initial.config); const [fields, setFields] = useState(initial.config.customFields);
  const dirty = mode === 'fields' ? JSON.stringify(fields) !== JSON.stringify(baseline.config.customFields) : JSON.stringify(config) !== JSON.stringify(baseline.config);
  const editField = (index: number, patch: Partial<CustomField>) => setFields((current) => current.map((field, i) => i === index ? { ...field, ...patch } : field));
  const reorder = (index: number, direction: -1 | 1) => setFields((current) => { const next = [...current]; const target = index + direction; if (target < 0 || target >= next.length) return current; [next[index], next[target]] = [next[target], next[index]]; return next; });
  return <CommandForm dialog initialOpen hideTrigger maxWidth={mode === 'fields' ? 'lg' : 'md'} title={mode === 'fields' ? 'Additional invoice fields' : 'Tax and document defaults'} label={mode === 'fields' ? 'Save custom fields' : 'Save defaults'} onClosed={onClosed} isSubmitDisabled={!dirty} successMessage={mode === 'fields' ? 'Invoice fields saved.' : 'Billing defaults saved.'} confirmation={{ title: mode === 'fields' ? 'Save invoice fields?' : 'Save billing defaults?', label: 'Confirm and save', description: `This saves a new settings version based on version ${expectedVersion}. Issued documents stay unchanged. Existing drafts must explicitly review changes to their saved field configuration.` }} saved={() => client.invalidateQueries({ queryKey: invoicesQueryKeys.settings(firmId) }, { throwOnError: true })} submit={async (data) => {
    const captured = String(data.get('configuration'));
    if (mode === 'fields') await saveInvoiceFields(expectedVersion, JSON.parse(captured) as CustomField[]);
    else { const { customFields, ...values } = JSON.parse(captured) as BillingSettings; void customFields; await saveBillingSettings(expectedVersion, values); }
  }}>
    <input type="hidden" name="configuration" value={JSON.stringify(mode === 'fields' ? fields : config)} />
    {mode === 'fields' ? <>
      <Typography>Choose field labels, types, order and PDF visibility. A field code links the same field across saved versions; keep it unchanged when editing its label.</Typography>
      {fields.map((field, index) => <Paper key={index} variant="outlined" sx={{ p: 2 }}><Stack spacing={2}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap"><Typography fontWeight={700}>Field {index + 1}</Typography><AppButton disabled={index === 0} onClick={() => reorder(index, -1)}>Move up</AppButton><AppButton disabled={index === fields.length - 1} onClick={() => reorder(index, 1)}>Move down</AppButton><AppButton color="error" onClick={() => setFields((current) => current.filter((_, i) => i !== index))}>Remove field</AppButton></Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField required fullWidth label="Field label" value={field.label} inputProps={{ maxLength: 100 }} onChange={(event) => editField(index, { label: event.target.value })} />
          <TextField required fullWidth label="Field code" value={field.key} inputProps={{ pattern: 'cf_[a-z][a-z0-9_]{0,44}', maxLength: 48 }} helperText="Unique code, for example cf_purchase_order" onChange={(event) => editField(index, { key: event.target.value })} />
          <TextField select label="Field type" value={field.type} sx={{ minWidth: 150 }} onChange={(event) => editField(index, { type: event.target.value as CustomField['type'], options: event.target.value === 'SELECT' ? ['Option 1'] : [] })}>{Object.entries(fieldTypes).map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}</TextField>
          <TextField select label="Width" value={field.width} sx={{ minWidth: 140 }} onChange={(event) => editField(index, { width: event.target.value as CustomField['width'] })}><MenuItem value="FULL">Full row</MenuItem><MenuItem value="HALF">Half row</MenuItem></TextField>
        </Stack>
        {field.type === 'SELECT' ? <TextField required multiline label="Options, one per line" value={field.options.join('\n')} onChange={(event) => editField(index, { options: event.target.value.split('\n') })} /> : null}
        <Stack direction="row" spacing={2}><FormControlLabel control={<Checkbox checked={field.required} onChange={(event) => editField(index, { required: event.target.checked })} />} label="Required before issue" /><FormControlLabel control={<Checkbox checked={field.showOnPdf} onChange={(event) => editField(index, { showOnPdf: event.target.checked })} />} label="Show on PDF" /></Stack>
      </Stack></Paper>)}
      <AppButton disabled={fields.length >= 50} onClick={() => setFields((current) => [...current, { key: `cf_field_${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`, label: '', type: 'TEXT', required: false, showOnPdf: true, width: 'HALF', options: [] }])}>Add custom field</AppButton>
    </> : <>
      <Alert severity="info">Choose e-invoice applicability based on your registration and turnover obligations. Supplies that require an Invoice Reference Number (IRN) cannot be issued until the e-invoice provider is integrated.</Alert>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField select fullWidth label="Registration type" value={config.registration} onChange={(event) => setConfig({ ...config, registration: event.target.value as typeof config.registration })}>{Object.entries(registrations).map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}</TextField>
        <TextField select fullWidth required label="Supplier registration state" value={config.sellerStateCode ?? ''} onChange={(event) => setConfig({ ...config, sellerStateCode: event.target.value })}>{Object.entries(initial.states).sort(([left], [right]) => left.localeCompare(right)).map(([code, name]) => <MenuItem key={code} value={code}>{code} — {name}</MenuItem>)}</TextField>
        <TextField select fullWidth required label="E-invoice obligations apply" value={config.einvoiceRequired === null ? '' : String(config.einvoiceRequired)} onChange={(event) => setConfig({ ...config, einvoiceRequired: event.target.value === 'true' })}><MenuItem value="true">Yes</MenuItem><MenuItem value="false">No</MenuItem></TextField>
      </Stack>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>{Object.entries(config.prefixes).map(([kind, value]) => <TextField key={kind} fullWidth required label={`${formatRecordStatus(kind)} prefix`} value={value} inputProps={{ pattern: '[A-Z0-9]{1,4}', maxLength: 4 }} onChange={(event) => setConfig({ ...config, prefixes: { ...config.prefixes, [kind as BillingKind]: event.target.value.toUpperCase() } })} />)}</Stack>
      <Typography variant="body2">Each document type has a separate financial-year number series, for example INV/2627/000001. Numbers are assigned when a document is issued and are kept in history after cancellation.</Typography>
      <Stack direction="row" spacing={2}><TextField select label="PDF template" value={config.template} sx={{ minWidth: 180 }} onChange={(event) => setConfig({ ...config, template: event.target.value as typeof config.template })}><MenuItem value="STANDARD">Standard</MenuItem><MenuItem value="COMPACT">Compact</MenuItem></TextField><TextField type="color" label="Accent colour" InputLabelProps={{ shrink: true }} value={config.primaryColour} onChange={(event) => setConfig({ ...config, primaryColour: event.target.value })} /></Stack>
      <TextField multiline minRows={2} label="Default payment instructions" value={config.paymentInstructions} onChange={(event) => setConfig({ ...config, paymentInstructions: event.target.value })} />
      <TextField multiline minRows={3} label="Default terms and conditions" value={config.termsAndConditions} onChange={(event) => setConfig({ ...config, termsAndConditions: event.target.value })} />
    </>}
  </CommandForm>;
}
