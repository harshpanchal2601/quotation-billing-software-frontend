import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined';
import KeyboardArrowUpOutlinedIcon from '@mui/icons-material/KeyboardArrowUpOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormHelperText from '@mui/material/FormHelperText';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useFieldArray, type Control, type FieldErrors } from 'react-hook-form';

import type { ItemFormValues } from '../items.schema';

type ItemSpecificationsFieldProps = {
  control: Control<ItemFormValues>;
  errors?: FieldErrors<ItemFormValues>;
  disabled?: boolean;
};

export function ItemSpecificationsField({ control, errors, disabled = false }: ItemSpecificationsFieldProps) {
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'specifications',
  });

  const specError = errors?.specifications?.root?.message || (typeof errors?.specifications?.message === 'string' ? errors.specifications.message : null);

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h6" fontWeight={600}>
            Item Specifications
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Add key technical attributes (e.g. Label: &quot;Heater Thread Size&quot;, Value: &quot;1.5 inch BSP&quot;).
          </Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          startIcon={<AddOutlinedIcon />}
          onClick={() => append({ label: '', value: '' })}
          disabled={disabled || fields.length >= 50}
        >
          Add Attribute
        </Button>
      </Stack>

      {specError ? (
        <FormHelperText error sx={{ fontSize: 13, fontWeight: 500 }}>
          {specError}
        </FormHelperText>
      ) : null}

      {fields.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', bgcolor: 'action.hover' }}>
          <Typography variant="body2" color="text.secondary">
            No specifications added. Click &quot;Add Attribute&quot; to include custom technical details.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {fields.map((field, index) => {
            const fieldError = errors?.specifications?.[index];
            return (
              <Paper key={field.id} variant="outlined" sx={{ p: 2, position: 'relative' }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'flex-start' }}>
                  <Typography
                    variant="caption"
                    fontWeight={700}
                    color="text.secondary"
                    sx={{ minWidth: 24, pt: 1 }}
                  >
                    #{index + 1}
                  </Typography>

                  <TextField
                    label="Label"
                    size="small"
                    fullWidth
                    disabled={disabled}
                    {...control.register(`specifications.${index}.label`)}
                    error={Boolean(fieldError?.label)}
                    helperText={fieldError?.label?.message}
                    placeholder="e.g. Capacity"
                  />

                  <TextField
                    label="Value"
                    size="small"
                    fullWidth
                    disabled={disabled}
                    {...control.register(`specifications.${index}.value`)}
                    error={Boolean(fieldError?.value)}
                    helperText={fieldError?.value?.message}
                    placeholder="e.g. 500 Liters"
                  />

                  <Stack direction="row" spacing={0.5} alignItems="center" alignSelf={{ xs: 'flex-end', sm: 'center' }}>
                    <IconButton
                      size="small"
                      aria-label={`Move specification ${index + 1} up`}
                      onClick={() => move(index, index - 1)}
                      disabled={disabled || index === 0}
                    >
                      <KeyboardArrowUpOutlinedIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      aria-label={`Move specification ${index + 1} down`}
                      onClick={() => move(index, index + 1)}
                      disabled={disabled || index === fields.length - 1}
                    >
                      <KeyboardArrowDownOutlinedIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      aria-label={`Remove specification ${index + 1}`}
                      onClick={() => remove(index)}
                      disabled={disabled}
                    >
                      <DeleteOutlineOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
