import TextField, { type TextFieldProps } from '@mui/material/TextField';
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';

export type ControlledTextFieldProps<TFieldValues extends FieldValues> = Omit<
  TextFieldProps,
  'name' | 'value' | 'defaultValue' | 'onChange' | 'onBlur' | 'error' | 'helperText'
> & {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  helperText?: TextFieldProps['helperText'];
};

export function ControlledTextField<TFieldValues extends FieldValues>({
  control,
  name,
  helperText,
  fullWidth = true,
  ...textFieldProps
}: ControlledTextFieldProps<TFieldValues>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <TextField
          {...textFieldProps}
          name={field.name}
          value={String(field.value ?? '')}
          onChange={field.onChange}
          onBlur={field.onBlur}
          inputRef={field.ref}
          fullWidth={fullWidth}
          error={fieldState.invalid}
          helperText={fieldState.error?.message ?? helperText}
        />
      )}
    />
  );
}
