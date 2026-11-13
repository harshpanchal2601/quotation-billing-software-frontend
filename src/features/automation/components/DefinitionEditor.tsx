import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { formatBusinessAction } from '@shared/ui/display';
import { AppButton } from '@shared/ui/actions';
import { actions, triggers, type ApprovalPolicy, type CustomField, type Definition, type DefinitionKind, type DocumentTemplate, type FieldConfiguration, type Step, type Workflow } from '../model/automation.types';

const label = (value: string) => value.toLowerCase().replace(/[._-]/g, ' ');
export function DefinitionEditor({ kind, value, onChange, recipients }: { kind: DefinitionKind; value: Definition; onChange: (value: Definition) => void; recipients: Array<{ id: number; name: string }> }) {
  return <Stack spacing={2}>
    <FormControlLabel label="Enabled for new activity" control={<Switch checked={value.enabled} onChange={(_, enabled) => onChange({ ...value, enabled })} />} />
    {kind === 'APPROVAL' ? <ApprovalEditor value={value as ApprovalPolicy} onChange={onChange} /> : kind === 'TEMPLATE' ? <TemplateEditor value={value as DocumentTemplate} onChange={onChange} /> : kind === 'CUSTOM_FIELDS' ? <FieldsEditor value={value as FieldConfiguration} onChange={onChange} /> : <WorkflowEditor value={value as Workflow} onChange={onChange} recipients={recipients} reminder={kind === 'NOTIFICATION'} />}
  </Stack>;
}
function ApprovalEditor({ value, onChange }: { value: ApprovalPolicy; onChange: (value: ApprovalPolicy) => void }) {
  return <Stack spacing={2}>
    <TextField select label="Action requiring approval" value={value.action} onChange={(event) => onChange({ enabled: value.enabled, action: event.target.value as ApprovalPolicy['action'], authority: 'OTHER_FIRM_ADMIN', expiresAfterHours: value.expiresAfterHours })}>{actions.map((action) => <MenuItem key={action} value={action}>{formatBusinessAction(action)}</MenuItem>)}</TextField>
    <Typography>A different active firm administrator decides. Approval is tied to the exact action and record version.</Typography>
    <TextField label="Approval expires after hours" type="number" value={value.expiresAfterHours} onChange={(event) => onChange({ ...value, expiresAfterHours: Number(event.target.value) })} />
    {value.action !== 'STOCK_ADJUST' ? <><TextField label="Minimum total requiring approval (optional)" value={value.minimumAmount ?? ''} onChange={(event) => { const next = { ...value }; delete next.minimumAmount; delete next.currency; onChange(event.target.value ? { ...next, minimumAmount: event.target.value, currency: value.currency ?? 'INR' } : next); }} />{value.minimumAmount !== undefined ? <TextField label="Threshold currency" value={value.currency ?? ''} onChange={(event) => onChange({ ...value, currency: event.target.value.toUpperCase() })} /> : null}</> : null}
    {['INVOICE_ISSUE', 'QUOTATION_SEND'].includes(value.action) ? <TextField label="Discount percentage above which approval is required (optional)" value={value.discountPercent ?? ''} onChange={(event) => { const next = { ...value }; delete next.discountPercent; onChange(event.target.value ? { ...next, discountPercent: event.target.value } : next); }} helperText="Leave both thresholds empty to require every action. When both are set, both must match." /> : null}
  </Stack>;
}
function TemplateEditor({ value, onChange }: { value: DocumentTemplate; onChange: (value: DocumentTemplate) => void }) {
  return <Stack spacing={2}>
    <TextField select label="Document" value={value.entity} onChange={(event) => onChange({ ...value, entity: event.target.value as DocumentTemplate['entity'] })}>{['QUOTATION', 'INVOICE', 'NOTICE'].map((entity) => <MenuItem key={entity} value={entity}>{label(entity)}</MenuItem>)}</TextField>
    <Typography variant="body2">Available placeholders: {'{{businessName}}, {{documentNumber}}, {{entityType}}, {{status}}, {{currency}}, {{total}}'}. Text is safely escaped.</Typography>
    <TextField label="Heading" multiline minRows={2} value={value.heading} onChange={(event) => onChange({ ...value, heading: event.target.value })} />
    <TextField label="Footer" multiline minRows={3} value={value.footer} onChange={(event) => onChange({ ...value, footer: event.target.value })} />
    <TextField label="Brand colour" type="color" value={value.primaryColour} onChange={(event) => onChange({ ...value, primaryColour: event.target.value })} />
  </Stack>;
}
function FieldsEditor({ value, onChange }: { value: FieldConfiguration; onChange: (value: FieldConfiguration) => void }) {
  function change(index: number, field: CustomField) { onChange({ ...value, fields: value.fields.map((old, position) => position === index ? field : old) }); }
  return <Stack spacing={2}>
    <TextField select label="Record type" value={value.entity} onChange={(event) => onChange({ ...value, entity: event.target.value as FieldConfiguration['entity'], fields: [] })}>{['COMPANY', 'ITEM', 'QUOTATION', 'INVOICE'].map((entity) => <MenuItem key={entity} value={entity}>{label(entity)}</MenuItem>)}</TextField>
    <Typography variant="body2">Store ordinary business data only. Secrets and sensitive personal data are outside this field policy. Published values retain their definition version.</Typography>
    {value.fields.map((field, index) => <Paper variant="outlined" sx={{ p: 2 }} key={index}><Stack spacing={2}>
      <TextField label="Field label" value={field.label} onChange={(event) => change(index, { ...field, label: event.target.value })} />
      <TextField label="Permanent field key" value={field.key} onChange={(event) => change(index, { ...field, key: event.target.value })} helperText="Use cf_ followed by lowercase letters, numbers or underscores. Keep this key when renaming a field." />
      <TextField select label="Value type" value={field.type} onChange={(event) => change(index, { ...field, type: event.target.value as CustomField['type'], options: [] })}>{['TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'SELECT'].map((type) => <MenuItem key={type} value={type}>{label(type)}</MenuItem>)}</TextField>
      {field.type === 'SELECT' ? <TextField label="Choices, one per line" multiline value={field.options.join('\n')} onChange={(event) => change(index, { ...field, options: event.target.value.split('\n') })} /> : null}
      <FormControlLabel label="Required" control={<Switch checked={field.required} onChange={(_, required) => change(index, { ...field, required })} />} />
      <FormControlLabel label={['COMPANY', 'ITEM'].includes(value.entity) ? 'Document output is available for quotation and invoice fields' : 'Visible on documents'} control={<Switch checked={field.visibility === 'DOCUMENT'} disabled={['COMPANY', 'ITEM'].includes(value.entity)} onChange={(_, checked) => change(index, { ...field, visibility: checked ? 'DOCUMENT' : 'INTERNAL', searchable: checked ? false : field.searchable })} />} />
      <FormControlLabel label="Allow exact value search" control={<Switch checked={field.searchable} disabled={field.visibility === 'DOCUMENT' || value.entity === 'INVOICE'} onChange={(_, searchable) => change(index, { ...field, searchable })} />} />
      <AppButton color="error" onClick={() => onChange({ ...value, fields: value.fields.filter((_, position) => index !== position) })}>Remove field</AppButton>
    </Stack></Paper>)}
    <AppButton disabled={value.fields.length >= 50} onClick={() => onChange({ ...value, fields: [...value.fields, { key: `cf_field_${crypto.randomUUID().slice(0, 8)}`, label: '', type: 'TEXT', required: false, searchable: false, visibility: 'INTERNAL', classification: 'BUSINESS', options: [] }] })}>Add field</AppButton>
  </Stack>;
}
function WorkflowEditor({ value, onChange, recipients, reminder }: { value: Workflow; onChange: (value: Workflow) => void; recipients: Array<{ id: number; name: string }>; reminder: boolean }) {
  function change(index: number, step: Step) { onChange({ ...value, steps: value.steps.map((old, position) => position === index ? step : old) }); }
  function target(labelText: string, selected: string, update: (id: string) => void) { return <TextField select label={labelText} value={selected} onChange={(event) => update(event.target.value)}>{value.steps.map((step, index) => <MenuItem key={step.id} value={step.id}>{index + 1}. {label(step.type)}</MenuItem>)}</TextField>; }
  return <Stack spacing={2}>
    <TextField label="Name" value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })} />
    <TextField select label="When this happens" value={value.trigger} onChange={(event) => onChange({ ...value, trigger: event.target.value as Workflow['trigger'] })}>{triggers.map((trigger) => <MenuItem key={trigger} value={trigger}>{formatBusinessAction(trigger)}</MenuItem>)}</TextField>
    <TextField label="Reminder delay in minutes" type="number" value={value.delayMinutes} onChange={(event) => onChange({ ...value, delayMinutes: Number(event.target.value) })} />
    <TextField label="Expires after minutes" type="number" value={value.expiresAfterMinutes} onChange={(event) => onChange({ ...value, expiresAfterMinutes: Number(event.target.value) })} />
    {target('First step', value.entry, (entry) => onChange({ ...value, entry }))}
    {value.steps.map((step, index) => <Paper variant="outlined" sx={{ p: 2 }} key={step.id}><Stack spacing={2}><Typography variant="subtitle1">Step {index + 1}: {label(step.type)}</Typography>
      {step.type === 'TEST' ? <>
        <TextField select label="Compare" value={step.predicate.field} onChange={(event) => change(index, { ...step, predicate: { field: event.target.value as typeof step.predicate.field, operator: 'EQ', value: '' } })}>{['trigger', 'status', 'currency', 'total', 'discountPercent'].map((field) => <MenuItem key={field} value={field}>{label(field)}</MenuItem>)}</TextField>
        <TextField select label="Condition" value={step.predicate.operator} onChange={(event) => change(index, { ...step, predicate: { ...step.predicate, operator: event.target.value as typeof step.predicate.operator } })}>{['EQ', 'NE', ...(['total', 'discountPercent'].includes(step.predicate.field) ? ['GTE', 'LTE'] : [])].map((operator) => <MenuItem key={operator} value={operator}>{({ EQ: 'Equals', NE: 'Does not equal', GTE: 'At least', LTE: 'At most' } as Record<string, string>)[operator]}</MenuItem>)}</TextField>
        <TextField label="Comparison value" value={step.predicate.value} onChange={(event) => change(index, { ...step, predicate: { ...step.predicate, value: event.target.value } })} />
        {target('If condition matches', step.yes, (yes) => change(index, { ...step, yes }))}{target('Otherwise', step.no, (no) => change(index, { ...step, no }))}
      </> : step.type === 'NOTIFY' ? <>
        <TextField label="Notification title" value={step.title} onChange={(event) => change(index, { ...step, title: event.target.value })} />
        <TextField label="Message" multiline minRows={3} value={step.body} onChange={(event) => change(index, { ...step, body: event.target.value })} helperText="Use the same safe placeholders as document templates." />
        <TextField select label="Recipients" value={step.recipientIds} SelectProps={{ multiple: true }} onChange={(event) => change(index, { ...step, recipientIds: (Array.isArray(event.target.value) ? event.target.value : String(event.target.value).split(',')).map(Number) })}>{recipients.map((recipient) => <MenuItem key={recipient.id} value={recipient.id}>{recipient.name}</MenuItem>)}</TextField>
        <Typography variant="body2">Recipients must opt in and retain access to the record at delivery time.</Typography>
        {target('Next step', step.next, (next) => change(index, { ...step, next }))}
      </> : null}
      {step.type !== 'STOP' ? <AppButton color="error" onClick={() => onChange({ ...value, steps: value.steps.filter((old) => old.id !== step.id).map((old) => old.type === 'TEST' ? { ...old, yes: old.yes === step.id ? 'finish' : old.yes, no: old.no === step.id ? 'finish' : old.no } : old.type === 'NOTIFY' && old.next === step.id ? { ...old, next: 'finish' } : old), entry: value.entry === step.id ? 'finish' : value.entry })}>Remove step</AppButton> : null}
    </Stack></Paper>)}
    {!reminder ? <Stack direction="row" spacing={1}><AppButton disabled={value.steps.length >= 32} onClick={() => { const id = `condition_${crypto.randomUUID().slice(0, 8)}`; onChange({ ...value, entry: id, steps: [{ id, type: 'TEST', predicate: { field: 'total', operator: 'GTE', value: '0' }, yes: value.entry, no: 'finish' }, ...value.steps] }); }}>Add condition</AppButton><AppButton disabled={value.steps.filter((step) => step.type === 'NOTIFY').length >= 4} onClick={() => { const id = `notify_${crypto.randomUUID().slice(0, 8)}`; onChange({ ...value, entry: id, steps: [{ id, type: 'NOTIFY', title: '{{documentNumber}}', body: '{{status}}', recipientIds: [], next: value.entry }, ...value.steps] }); }}>Add notification</AppButton></Stack> : null}
  </Stack>;
}
