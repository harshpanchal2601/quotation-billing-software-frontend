import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import Switch, { type SwitchProps } from '@mui/material/Switch';
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';

export type ControlledSwitchProps<
  TFieldValues extends FieldValues,
  TTransformedValues = TFieldValues,
> = Omit<
  SwitchProps,
  'name' | 'checked' | 'defaultChecked' | 'onChange' | 'onBlur' | 'inputRef'
> & {
  control: Control<TFieldValues, unknown, TTransformedValues>;
  name: FieldPath<TFieldValues>;
  label: string;
  helperText?: string;
};

export function ControlledSwitch<
  TFieldValues extends FieldValues,
  TTransformedValues = TFieldValues,
>({
  control,
  name,
  label,
  helperText,
  disabled,
  required,
  ...switchProps
}: ControlledSwitchProps<TFieldValues, TTransformedValues>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <FormControl required={required} error={fieldState.invalid} disabled={disabled}>
          <FormControlLabel
            control={
              <Switch
                {...switchProps}
                name={field.name}
                checked={Boolean(field.value)}
                onChange={(event) => field.onChange(event.target.checked)}
                onBlur={field.onBlur}
                inputRef={field.ref}
                disabled={disabled}
                required={required}
              />
            }
            label={label}
          />
          {fieldState.error?.message || helperText ? (
            <FormHelperText>{fieldState.error?.message ?? helperText}</FormHelperText>
          ) : null}
        </FormControl>
      )}
    />
  );
}
