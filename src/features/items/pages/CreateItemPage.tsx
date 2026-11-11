import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { paths } from '@shared/routing/paths';
import { useSaveAndReturn } from '@shared/routing/returnNavigation';
import { PageContainer, PageHeader } from '@shared/ui/layout';
import { createItemRequest } from '../api/items.api';

import { ItemForm } from '../components/ItemForm';
import { itemsQueryKeys } from '../model/items.query-keys';
import type { ItemFormValues } from '../model/items.schema';

export function CreateItemPage() {
  const { cancel, saved, failed, hasSaved } = useSaveAndReturn(paths.items);
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (values: ItemFormValues) =>
      createItemRequest({
        name: values.name,
        kind: values.kind,
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
    onSuccess: async () => {
      await saved('Item created successfully.', () => queryClient.invalidateQueries({ queryKey: itemsQueryKeys.all }));
    },
    onError: (error) => { const failure = failed(error); if (!failure.cancelled) setServerError(failure.message); },
  });

  async function handleSubmit(values: ItemFormValues) {
    setServerError(null);
    if (mutation.isPending) return;
    try { await mutation.mutateAsync(values); } catch { /* The mutation reports the failure and retains the form. */ }
  }

  return (
    <PageContainer>
      <PageHeader title="Add Item" description="Create a new product or service item for quotations." />

      <ItemForm hasSaved={hasSaved}
        isSubmitting={mutation.isPending}
        onSubmit={handleSubmit}
        onCancel={cancel}
        serverError={serverError}
      />
    </PageContainer>
  );
}
