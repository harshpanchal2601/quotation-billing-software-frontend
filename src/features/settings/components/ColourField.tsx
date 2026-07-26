import Box from '@mui/material/Box';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import type { Control, FieldValues, Path } from 'react-hook-form';
import { Controller } from 'react-hook-form';

import { normaliseHexColour } from '../settings.utils';

type ColourFieldProps<TValues extends FieldValues, TSubmitValues extends FieldValues = TValues> = {
  control: Control<TValues, unknown, TSubmitValues>;
  name: Path<TValues>;
  label: string;
  disabled?: boolean;
};

export function ColourField<TValues extends FieldValues, TSubmitValues extends FieldValues = TValues>({
  control,
  name,
  label,
  disabled,
}: ColourFieldProps<TValues, TSubmitValues>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const value = typeof field.value === 'string' ? field.value : '#000000';
        const pickerValue = /^#[0-9A-Fa-f]{6}$/.test(value) ? value : '#000000';
        return (
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <TextField
              {...field}
              fullWidth
              required
              label={label}
              value={value}
              disabled={disabled}
              error={fieldState.invalid}
              helperText={fieldState.error?.message}
              onBlur={(event) => {
                field.onChange(normaliseHexColour(event.target.value));
                field.onBlur();
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Box
                      aria-hidden
                      sx={{ width: 20, height: 20, borderRadius: 0.75, border: 1, borderColor: 'divider', bgcolor: pickerValue }}
                    />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label={`${label} picker`}
              type="color"
              value={pickerValue}
              disabled={disabled}
              onChange={(event) => field.onChange(event.target.value.toUpperCase())}
              inputProps={{ 'aria-label': `${label} colour picker` }}
              sx={{ width: 88, '& input': { p: 1, height: 38 } }}
            />
          </Stack>
        );
      }}
    />
  );
}
