import { MenuItem, Tab, Tabs, TextField, useMediaQuery, useTheme } from '@mui/material';

type Props<Value extends string> = { value: Value; items: readonly { value: Value; label: string }[]; label: string; onChange: (value: Value) => void };

// Long workspace labels must not hide the current record type on a phone.
export function WorkspaceTabs<Value extends string>({ value, items, label, onChange }: Props<Value>) {
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down('sm'));
  if (compact) return <TextField select fullWidth label={label} value={value} onChange={(event) => { const selected = items.find((item) => item.value === event.target.value); if (selected) onChange(selected.value); }}>{items.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}</TextField>;
  return <Tabs value={value} onChange={(_, selected: Value) => onChange(selected)} aria-label={label} variant="scrollable" scrollButtons="auto">{items.map((item) => <Tab key={item.value} value={item.value} label={item.label} />)}</Tabs>;
}
