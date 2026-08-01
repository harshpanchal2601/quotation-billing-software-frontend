import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { toApiError } from '@shared/api/apiClient';
import { applyApiFieldErrors } from '@shared/forms/formErrors';
import {
  createMeasurementUnitRequest,
  updateMeasurementUnitRequest,
} from '../api/measurement-units.api';
import { measurementUnitsQueryKeys } from '../model/measurement-units.query-keys';
import {
  measurementUnitFormSchema,
  type MeasurementUnitFormValues,
} from '../model/measurement-units.schema';
import type { MeasurementUnitListItem } from '../model/measurement-units.types';

type FormDialogProps = {
  open: boolean;
  unit: MeasurementUnitListItem | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
};

export function MeasurementUnitFormDialog({ open, unit, onClose, onSuccess }: FormDialogProps) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEditing = Boolean(unit);

  const form = useForm<MeasurementUnitFormValues>({
    resolver: zodResolver(measurementUnitFormSchema),
    defaultValues: {
      name: '',
      symbol: '',
      allowDecimal: true,
      isActive: true,
    },
  });
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const allowDecimalValue = watch('allowDecimal');
  const isActiveValue = watch('isActive');

  useEffect(() => {
    if (open) {
      setServerError(null);
      if (unit) {
        reset({
          name: unit.name,
          symbol: unit.symbol,
          allowDecimal: unit.allowDecimal,
          isActive: unit.isActive,
        });
      } else {
        reset({
          name: '',
          symbol: '',
          allowDecimal: true,
          isActive: true,
        });
      }
    }
  }, [open, unit, reset]);

  const mutation = useMutation({
    mutationFn: async (values: MeasurementUnitFormValues) => {
      if (isEditing && unit) {
        return updateMeasurementUnitRequest(unit.id, {
          name: values.name,
          symbol: values.symbol,
          allowDecimal: values.allowDecimal,
          isActive: values.isActive,
        });
      }
      return createMeasurementUnitRequest({
        name: values.name,
        symbol: values.symbol,
        allowDecimal: values.allowDecimal,
        isActive: values.isActive,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: measurementUnitsQueryKeys.all });
      onSuccess(isEditing ? 'Measurement unit updated successfully.' : 'Measurement unit created successfully.');
      onClose();
    },
    onError: (error) => {
      const apiError = toApiError(error);
      applyApiFieldErrors(form, apiError.fieldErrors);
      setServerError(apiError.message);
    },
  });

  async function onSubmit(values: MeasurementUnitFormValues) {
    setServerError(null);
    form.clearErrors();
    try {
      await mutation.mutateAsync(values);
    } catch {
      // Server error message is handled by mutation onError callback
    }
  }

  return (
    <Dialog open={open} onClose={mutation.isPending ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEditing ? 'Edit Measurement Unit' : 'Add Measurement Unit'}</DialogTitle>
      <Box component="form" onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            {serverError ? <Alert severity="error">{serverError}</Alert> : null}

            <TextField
              label="Unit name"
              required
              fullWidth
              {...register('name')}
              error={Boolean(errors.name)}
              helperText={errors.name?.message ?? 'Full name of the unit, e.g., Kilogram, Piece, Meter.'}
            />

            <TextField
              label="Symbol"
              required
              fullWidth
              {...register('symbol')}
              error={Boolean(errors.symbol)}
              helperText={errors.symbol?.message ?? 'Exact symbol string, e.g., kg, m², NOS, %.'}
            />

            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={allowDecimalValue}
                    onChange={(e) => setValue('allowDecimal', e.target.checked)}
                    disabled={mutation.isPending}
                  />
                }
                label="Allow decimal quantities"
              />
              <FormHelperText>
                {allowDecimalValue
                  ? 'Enabled: fractional quantities such as 1.5 or 0.25 are allowed.'
                  : 'Disabled: only whole integer quantities are allowed.'}
              </FormHelperText>
            </Box>

            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={isActiveValue}
                    onChange={(e) => setValue('isActive', e.target.checked)}
                    disabled={mutation.isPending}
                  />
                }
                label="Active measurement unit"
              />
              <FormHelperText>
                Inactive measurement units cannot be selected when creating or updating items.
              </FormHelperText>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" loading={mutation.isPending}>
            {isEditing ? 'Save Changes' : 'Create Measurement Unit'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
