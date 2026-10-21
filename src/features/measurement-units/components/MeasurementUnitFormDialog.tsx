import { zodResolver } from '@hookform/resolvers/zod';
import Stack from '@mui/material/Stack';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { toApiError } from '@shared/api/apiClient';
import { applyApiFieldErrors, FormActions } from '@shared/forms';
import { ControlledSwitch, ControlledTextField } from '@shared/forms/controlled';
import { FormDialogShell } from '@shared/ui/dialogs';
import { ServerErrorAlert } from '@shared/ui/feedback';
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
    handleSubmit,
    reset,
    watch,
    control,
  } = form;

  const allowDecimalValue = watch('allowDecimal');

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
    <FormDialogShell
      open={open}
      title={isEditing ? 'Edit Measurement Unit' : 'Add Measurement Unit'}
      onClose={onClose}
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      isSubmitting={mutation.isPending}
      actions={(formId) => (
        <FormActions
          submitLabel={isEditing ? 'Save Changes' : 'Create Measurement Unit'}
          isSubmitting={mutation.isPending}
          onCancel={onClose}
          submitButtonProps={{ form: formId }}
        />
      )}
    >
      <Stack spacing={2.5}>
        <ServerErrorAlert message={serverError} />

        <ControlledTextField
          control={control}
          name="name"
          label="Unit name"
          required
          helperText="Full name of the unit, e.g., Kilogram, Piece, Meter."
        />

        <ControlledTextField
          control={control}
          name="symbol"
          label="Symbol"
          required
          helperText="Exact symbol string, e.g., kg, m², NOS, %."
        />

        <ControlledSwitch
          control={control}
          name="allowDecimal"
          label="Allow decimal quantities"
          disabled={mutation.isPending}
          helperText={
            allowDecimalValue
              ? 'Enabled: fractional quantities such as 1.5 or 0.25 are allowed.'
              : 'Disabled: only whole integer quantities are allowed.'
          }
        />

        <ControlledSwitch
          control={control}
          name="isActive"
          label="Active measurement unit"
          disabled={mutation.isPending}
          helperText="Inactive measurement units cannot be selected when creating or updating items."
        />
      </Stack>
    </FormDialogShell>
  );
}
