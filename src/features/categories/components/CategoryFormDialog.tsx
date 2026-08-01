import { zodResolver } from '@hookform/resolvers/zod';
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
import Typography from '@mui/material/Typography';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { toApiError } from '@shared/api/apiClient';
import { applyApiFieldErrors } from '@shared/forms/formErrors';
import { AppButton } from '@shared/ui/actions';
import { ServerErrorAlert } from '@shared/ui/feedback';
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
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const isActiveValue = watch('isActive');

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
    <Dialog open={open} onClose={mutation.isPending ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEditing ? 'Edit Category' : 'Add Category'}</DialogTitle>
      <Box component="form" onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <ServerErrorAlert message={serverError} />

            <TextField
              label="Category name"
              required
              fullWidth
              {...register('name')}
              error={Boolean(errors.name)}
              helperText={errors.name?.message}
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

            <TextField
              label="Description"
              multiline
              rows={3}
              fullWidth
              {...register('description')}
              error={Boolean(errors.description)}
              helperText={errors.description?.message ?? 'Optional brief description for the category.'}
            />

            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={isActiveValue}
                    onChange={(e) => setValue('isActive', e.target.checked)}
                    disabled={isProtected || mutation.isPending}
                  />
                }
                label="Active category"
              />
              {isProtected ? (
                <FormHelperText error={false}>
                  The default Uncategorised category cannot be deactivated.
                </FormHelperText>
              ) : (
                <FormHelperText>
                  Inactive categories cannot be selected when creating or updating items.
                </FormHelperText>
              )}
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <AppButton type="submit" variant="contained" isLoading={mutation.isPending}>
            {isEditing ? 'Save Changes' : 'Create Category'}
          </AppButton>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
