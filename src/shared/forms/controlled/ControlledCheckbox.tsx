import Checkbox, { type CheckboxProps } from '@mui/material/Checkbox';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';

export type ControlledCheckboxProps<
  TFieldValues extends FieldValues,
  TTransformedValues = TFieldValues,
> = Omit<
  CheckboxProps,
  'name' | 'checked' | 'defaultChecked' | 'onChange' | 'onBlur' | 'inputRef'
> & {
  control: Control<TFieldValues, unknown, TTransformedValues>;
  name: FieldPath<TFieldValues>;
  label: string;
  helperText?: string;
};

export function ControlledCheckbox<
  TFieldValues extends FieldValues,
  TTransformedValues = TFieldValues,
>({
  control,
  name,
  label,
  helperText,
  disabled,
  required,
  ...checkboxProps
}: ControlledCheckboxProps<TFieldValues, TTransformedValues>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <FormControl required={required} error={fieldState.invalid} disabled={disabled}>
          <FormControlLabel
            control={
              <Checkbox
                {...checkboxProps}
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
