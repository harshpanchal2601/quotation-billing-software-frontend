import { zodResolver } from '@hookform/resolvers/zod';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { toApiError } from '@shared/api/apiClient';
import { applyApiFieldErrors, FormActions } from '@shared/forms';
import { ControlledSwitch, ControlledTextField } from '@shared/forms/controlled';
import { ServerErrorAlert } from '@shared/ui/feedback';
import { FormDialogShell } from '@shared/ui/dialogs';
import { createCategoryRequest, updateCategoryRequest } from '../api/categories.api';
import { categoriesQueryKeys } from '../model/categories.query-keys';
import { categoryFormSchema, type CategoryFormValues } from '../model/categories.schema';
import type { CategoryListItem } from '../model/categories.types';
import { isProtectedCategory } from '../model/categories.utils';

type CategoryFormDialogProps = {
  open: boolean;
  category: CategoryListItem | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
};

export function CategoryFormDialog({ open, category, onClose, onSuccess }: CategoryFormDialogProps) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEditing = Boolean(category);
  const isProtected = category ? isProtectedCategory(category.slug) : false;

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: '',
      description: '',
      isActive: true,
    },
  });
  const {
    handleSubmit,
    reset,
    control,
  } = form;

  useEffect(() => {
    if (open) {
      setServerError(null);
      if (category) {
        reset({
          name: category.name,
          description: category.description ?? '',
          isActive: category.isActive,
        });
      } else {
        reset({
          name: '',
          description: '',
          isActive: true,
        });
      }
    }
  }, [open, category, reset]);

  const mutation = useMutation({
    mutationFn: async (values: CategoryFormValues) => {
      if (isEditing && category) {
        return updateCategoryRequest(category.id, {
          name: values.name,
          description: values.description || null,
          isActive: isProtected ? true : values.isActive,
        });
      }
      return createCategoryRequest({
        name: values.name,
        description: values.description || undefined,
        isActive: values.isActive,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: categoriesQueryKeys.all });
      onSuccess(isEditing ? 'Category updated successfully.' : 'Category created successfully.');
      onClose();
    },
    onError: (error) => {
      const apiError = toApiError(error);
      applyApiFieldErrors(form, apiError.fieldErrors);
      setServerError(apiError.message);
    },
  });

  async function onSubmit(values: CategoryFormValues) {
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
      title={isEditing ? 'Edit Category' : 'Add Category'}
      onClose={onClose}
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      isSubmitting={mutation.isPending}
      actions={(formId) => (
        <FormActions
          submitLabel={isEditing ? 'Save Changes' : 'Create Category'}
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
          label="Category name"
          required
        />

        {isEditing && category ? (
          <TextField
            label="Slug"
            value={category.slug}
            fullWidth
            disabled
            helperText="Slug is generated on creation and is read-only."
          />
        ) : (
          <Typography variant="caption" color="text.secondary">
            Note: Slug will be generated automatically from the category name.
          </Typography>
        )}

        <ControlledTextField
          control={control}
          name="description"
          label="Description"
          multiline
          rows={3}
          helperText="Optional brief description for the category."
        />

        <ControlledSwitch
          control={control}
          name="isActive"
          label="Active category"
          disabled={isProtected || mutation.isPending}
          helperText={
            isProtected
              ? 'The default Uncategorised category cannot be deactivated.'
              : 'Inactive categories cannot be selected when creating or updating items.'
          }
        />
      </Stack>
    </FormDialogShell>
  );
}
