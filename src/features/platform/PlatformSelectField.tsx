import MenuItem from '@mui/material/MenuItem';
import TextField, { type TextFieldProps } from '@mui/material/TextField';
import type { PlatformOption } from './subscriptions.types';

type PlatformSelectFieldProps = Omit<TextFieldProps, 'select' | 'children' | 'value' | 'defaultValue' | 'onChange'> & {
  value: string;
  options: readonly PlatformOption[];
  onChange: (value: string) => void;
  emptyLabel?: string;
};

export function PlatformSelectField({ value, options, onChange, emptyLabel, ...props }: PlatformSelectFieldProps) {
  return (
    <TextField {...props} select value={value} onChange={(event) => onChange(event.target.value)}>
      {emptyLabel !== undefined ? <MenuItem value="">{emptyLabel}</MenuItem> : null}
      {value !== '' && !options.some((option) => option.value === value) ? <MenuItem value={value} disabled>{value} (current value)</MenuItem> : null}
      {options.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
    </TextField>
  );
}
