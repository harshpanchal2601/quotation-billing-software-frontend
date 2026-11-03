import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { CustomField, CustomValues } from '../model/invoices.types';

export function CustomFieldsForm({ fields, values, onChange, disabled = false }: { fields: CustomField[]; values: CustomValues; onChange: (values: CustomValues) => void; disabled?: boolean }) {
  if (fields.length === 0) return null;
  return <Stack spacing={2}><Typography variant="h6">Additional fields</Typography><Stack direction="row" useFlexGap flexWrap="wrap" spacing={2}>
    {fields.map((field) => <Stack key={field.key} sx={{ flexBasis: field.width === 'FULL' ? '100%' : 'calc(50% - 16px)', flexGrow: 1, minWidth: 220 }}>
      {field.type === 'BOOLEAN' ? <FormControlLabel label={`${field.label}${field.required ? ' *' : ''}`} control={<Checkbox disabled={disabled} checked={values[field.key] === true} indeterminate={values[field.key] === null || values[field.key] === undefined} onChange={(event) => onChange({ ...values, [field.key]: event.target.checked })} />} /> :
        <TextField disabled={disabled} label={field.label} required={field.required} value={typeof values[field.key] === 'string' ? values[field.key] : ''} type={field.type === 'DATE' ? 'date' : 'text'} select={field.type === 'SELECT'} InputLabelProps={field.type === 'DATE' ? { shrink: true } : undefined} inputProps={field.type === 'NUMBER' ? { inputMode: 'decimal', pattern: '-?[0-9]{1,18}(\\.[0-9]{1,6})?' } : { maxLength: 4000 }} onChange={(event) => onChange({ ...values, [field.key]: event.target.value })}>
          {field.type === 'SELECT' ? [<MenuItem key="empty" value="">Choose an option</MenuItem>, ...field.options.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)] : null}
        </TextField>}
    </Stack>)}
  </Stack></Stack>;
}
