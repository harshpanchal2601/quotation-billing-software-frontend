import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'react-router-dom';

import { ErrorState } from '@shared/components/common/ErrorState';
import { AppButton } from '@shared/ui/actions';
import { useSaveAndReturn } from '@shared/routing/returnNavigation';
import { useNotification } from '@shared/ui/feedback';
import { PageContainer, PageHeader } from '@shared/ui/layout';
import { paths } from '@shared/routing/paths';
import { toApiError } from '@shared/api/apiClient';
import { getItemRequest, updateItemRequest } from '../api/items.api';
import { ItemForm } from '../components/ItemForm';
import { ItemImageSection } from '../components/ItemImageSection';
import { itemsQueryKeys } from '../model/items.query-keys';
import type { ItemFormValues } from '../model/items.schema';

export function EditItemPage() {
  const { id } = useParams<{ id: string }>();
  const itemId = Number(id);
  const { cancel, saved, failed, hasSaved } = useSaveAndReturn(paths.items);
  const notify = useNotification();
  const queryClient = useQueryClient();

  const [serverError, setServerError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: itemsQueryKeys.detail(itemId),
    queryFn: () => getItemRequest(itemId),
    enabled: Number.isInteger(itemId) && itemId > 0,
  });

  const mutation = useMutation({
    mutationFn: (values: ItemFormValues) =>
      updateItemRequest(itemId, {
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
    onSuccess: async (updated) => {
      queryClient.setQueryData(itemsQueryKeys.detail(itemId), updated);
      await saved('Item updated successfully.', () => queryClient.invalidateQueries({ queryKey: itemsQueryKeys.all }));
    },
    onError: (error) => { const failure = failed(error); if (!failure.cancelled) setServerError(failure.message); },
  });

  async function handleSubmit(values: ItemFormValues) {
    setServerError(null);
    if (mutation.isPending) return;
    try { await mutation.mutateAsync(values); } catch { /* The mutation reports the failure and retains the form. */ }
  }

  if (query.isPending) {
    return (
      <PageContainer>
        <Skeleton height={40} width="30%" />
        <Skeleton height={200} />
        <Skeleton height={300} />
      </PageContainer>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Stack spacing={2} py={4}>
        <ErrorState message={query.error ? toApiError(query.error).message : 'Item not found'} />
        <AppButton variant="outlined" sx={{ alignSelf: 'flex-start' }} onClick={() => void query.refetch()}>
          Retry
        </AppButton>
      </Stack>
    );
  }

  const item = query.data;

  return (
    <PageContainer>
      <PageHeader
        title={`Edit ${item.name}`}
        description={`Update item details, pricing, specifications or product image. Code: ${item.itemCode}`}
      />

      <ItemImageSection item={item} onSuccess={notify} />

      <ItemForm hasSaved={hasSaved}
        initialValues={item}
        isSubmitting={mutation.isPending}
        onSubmit={handleSubmit}
        onCancel={cancel}
        serverError={serverError}
      />
    </PageContainer>
  );
}
