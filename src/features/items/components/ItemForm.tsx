import { zodResolver } from '@hookform/resolvers/zod';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { categoriesQueryKeys, getCategoryOptionsRequest } from '@features/categories';
import { getMeasurementUnitOptionsRequest, measurementUnitsQueryKeys } from '@features/measurement-units';
import { FormActions } from '@shared/forms';
import { ControlledSwitch, ControlledTextField } from '@shared/forms/controlled';
import { ServerErrorAlert } from '@shared/ui/feedback';
import { itemFormSchema, type ItemFormValues } from '../items.schema';
import type { ItemDetail } from '../items.types';
import { formatItemSourceTypeLabel } from '../items.utils';
import { ItemSpecificationsField } from './ItemSpecificationsField';

type ItemFormProps = {
  initialValues?: ItemDetail | null;
  isSubmitting?: boolean;
  onSubmit: (values: ItemFormValues) => Promise<void>;
  onCancel: () => void;
  serverError?: string | null;
};

export function ItemForm({
  initialValues,
  isSubmitting = false,
  onSubmit,
  onCancel,
  serverError,
}: ItemFormProps) {
  const isEditing = Boolean(initialValues);

  const categoriesQuery = useQuery({
    queryKey: categoriesQueryKeys.options(),
    queryFn: getCategoryOptionsRequest,
  });

  const unitsQuery = useQuery({
    queryKey: measurementUnitsQueryKeys.options(),
    queryFn: getMeasurementUnitOptionsRequest,
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      name: '',
      categoryId: null,
      measurementUnitId: undefined as unknown as number,
      shortDescription: '',
      detailedDescription: '',
      defaultRate: '0.00',
      hsnCode: '',
      gstRate: '18.00',
      isActive: true,
      specifications: [],
    },
  });

  const categoryIdValue = watch('categoryId');
  const measurementUnitIdValue = watch('measurementUnitId');

  useEffect(() => {
    if (initialValues) {
      reset({
        name: initialValues.name,
        categoryId: initialValues.category?.id ?? null,
        measurementUnitId: initialValues.measurementUnit.id,
        shortDescription: initialValues.shortDescription ?? '',
        detailedDescription: initialValues.detailedDescription ?? '',
        defaultRate: initialValues.defaultRate,
        hsnCode: initialValues.hsnCode ?? '',
        gstRate: initialValues.gstRate,
        isActive: initialValues.isActive,
        specifications: initialValues.specifications,
      });
    }
  }, [initialValues, reset]);

  return (
    <Box component="form" onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
      <Stack spacing={3}>
        <ServerErrorAlert message={serverError} />

        <Card variant="outlined">
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} mb={2.5}>
              Basic Information
            </Typography>

            <Stack spacing={2.5}>
              <ControlledTextField
                control={control}
                name="name"
                label="Item name"
                required
                helperText="Name of the item or equipment."
                disabled={isSubmitting}
              />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Item Code"
                  value={initialValues ? initialValues.itemCode : 'Auto-generated'}
                  fullWidth
                  disabled
                  helperText={
                    isEditing
                      ? 'Item code is read-only.'
                      : 'Item code (e.g. ITEM-000001) will be generated automatically upon creation.'
                  }
                />

                {isEditing && initialValues ? (
                  <TextField
                    label="Source Type"
                    value={formatItemSourceTypeLabel(initialValues.sourceType)}
                    fullWidth
                    disabled
                    helperText="Source type is read-only."
                  />
                ) : null}
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} mb={2.5}>
              Category & Measurement Unit
            </Typography>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5}>
              <TextField
                select
                label="Product Category"
                fullWidth
                value={categoryIdValue === null || categoryIdValue === undefined ? '' : String(categoryIdValue)}
                onChange={(e) => {
                  const val = e.target.value;
                  setValue('categoryId', val === '' ? null : Number(val), { shouldDirty: true });
                }}
                disabled={isSubmitting || categoriesQuery.isPending}
                error={Boolean(errors.categoryId)}
                helperText={
                  errors.categoryId?.message ??
                  'Optional. If unselected, system will automatically assign the default Uncategorised category.'
                }
              >
                <MenuItem value="">
                  <em>Use Uncategorised (Default)</em>
                </MenuItem>
                {categoriesQuery.data?.map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>
                    {cat.name} ({cat.slug})
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                required
                label="Measurement Unit"
                fullWidth
                value={measurementUnitIdValue === undefined || measurementUnitIdValue === null ? '' : String(measurementUnitIdValue)}
                onChange={(e) => {
                  setValue('measurementUnitId', Number(e.target.value), { shouldDirty: true, shouldValidate: true });
                }}
                disabled={isSubmitting || unitsQuery.isPending}
                error={Boolean(errors.measurementUnitId)}
                helperText={errors.measurementUnitId?.message ?? 'Required unit of measurement for billing.'}
              >
                <MenuItem value="" disabled>
                  <em>Select Measurement Unit</em>
                </MenuItem>
                {unitsQuery.data?.map((unit) => (
                  <MenuItem key={unit.id} value={unit.id}>
                    {unit.symbol} — {unit.name} ({unit.allowDecimal ? 'Decimal allowed' : 'Whole numbers only'})
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} mb={2.5}>
              Pricing & Tax
            </Typography>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5}>
              <TextField
                label="Default Rate (₹)"
                required
                fullWidth
                {...register('defaultRate')}
                error={Boolean(errors.defaultRate)}
                helperText={errors.defaultRate?.message ?? 'Base unit rate in INR (e.g. 4500.00).'}
                disabled={isSubmitting}
              />

              <TextField
                label="GST Rate (%)"
                required
                fullWidth
                {...register('gstRate')}
                error={Boolean(errors.gstRate)}
                helperText={errors.gstRate?.message ?? 'GST tax percentage (e.g. 18.00).'}
                disabled={isSubmitting}
              />

              <ControlledTextField
                control={control}
                name="hsnCode"
                label="HSN Code"
                helperText="Optional 4 to 8 numeric digits."
                disabled={isSubmitting}
              />
            </Stack>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} mb={2.5}>
              Descriptions
            </Typography>

            <Stack spacing={2.5}>
              <ControlledTextField
                control={control}
                name="shortDescription"
                label="Short description"
                helperText="Brief summary shown in item lists (max 500 characters)."
                disabled={isSubmitting}
              />

              <ControlledTextField
                control={control}
                name="detailedDescription"
                label="Detailed description"
                multiline
                rows={4}
                helperText="Comprehensive product description for quotations."
                disabled={isSubmitting}
              />
            </Stack>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent sx={{ p: 3 }}>
            <ItemSpecificationsField control={control} errors={errors} disabled={isSubmitting} />
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} mb={1}>
              Item Status
            </Typography>
            <ControlledSwitch
              control={control}
              name="isActive"
              label="Active Item"
              disabled={isSubmitting}
              helperText="Inactive items cannot be selected when creating or updating quotations."
            />
          </CardContent>
        </Card>

        <FormActions
          spacing={2}
          isSubmitting={isSubmitting}
          isSubmitDisabled={isSubmitting || (isEditing && !isDirty)}
          onCancel={onCancel}
          submitLabel={isEditing ? 'Save Changes' : 'Create Item'}
          cancelButtonProps={{ variant: 'outlined' }}
        />
      </Stack>
    </Box>
  );
}
