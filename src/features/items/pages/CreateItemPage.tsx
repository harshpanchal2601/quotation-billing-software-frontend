import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { paths } from '@shared/routing/paths';
import { toApiError } from '@shared/api/apiClient';
import { AppSnackbar } from '@shared/ui/feedback';
import { PageContainer, PageHeader } from '@shared/ui/layout';
import { createItemRequest } from '../api/items.api';

import { ItemForm } from '../components/ItemForm';
import { itemsQueryKeys } from '../model/items.query-keys';
import type { ItemFormValues } from '../model/items.schema';

export function CreateItemPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (values: ItemFormValues) =>
      createItemRequest({
        name: values.name,
        categoryId: values.categoryId,
        measurementUnitId: values.measurementUnitId,
        shortDescription: values.shortDescription || null,
        detailedDescription: values.detailedDescription || null,
        specifications: values.specifications,
        defaultRate: values.defaultRate,
        hsnCode: values.hsnCode || null,
        gstRate: values.gstRate,
        isActive: values.isActive,
      }),
    onSuccess: async (newItem) => {
      await queryClient.invalidateQueries({ queryKey: itemsQueryKeys.all });
      setSnackbarMessage('Item created successfully.');
      navigate(`${paths.items}/${newItem.id}`, { replace: true });
    },
    onError: (error) => {
      setServerError(toApiError(error).message);
    },
  });

  async function handleSubmit(values: ItemFormValues) {
    setServerError(null);
    try {
      await mutation.mutateAsync(values);
    } catch {
      // Server error is handled by mutation onError callback
    }
  }

  return (
    <PageContainer>
      <PageHeader title="Add Item" description="Create a new product or service item for quotations." />

      <ItemForm
        isSubmitting={mutation.isPending}
        onSubmit={handleSubmit}
        onCancel={() => navigate(paths.items)}
        serverError={serverError}
      />

      <AppSnackbar open={snackbarMessage !== null} autoHideDuration={4000} message={snackbarMessage} onClose={() => setSnackbarMessage(null)} />
    </PageContainer>
  );
}
