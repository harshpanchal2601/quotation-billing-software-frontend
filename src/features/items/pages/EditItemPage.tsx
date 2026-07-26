import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ErrorState } from '../../../components/common/ErrorState';
import { paths } from '../../../routes/routeConfig';
import { toApiError } from '../../../services/apiClient';
import { getItemRequest, updateItemRequest } from '../api/items.api';
import { ItemForm } from '../components/ItemForm';
import { ItemImageSection } from '../components/ItemImageSection';
import { itemsQueryKeys } from '../items.query-keys';
import type { ItemFormValues } from '../items.schema';

export function EditItemPage() {
  const { id } = useParams<{ id: string }>();
  const itemId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const query = useQuery({
    queryKey: itemsQueryKeys.detail(itemId),
    queryFn: () => getItemRequest(itemId),
    enabled: Number.isInteger(itemId) && itemId > 0,
  });

  const mutation = useMutation({
    mutationFn: (values: ItemFormValues) =>
      updateItemRequest(itemId, {
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
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: itemsQueryKeys.all });
      queryClient.setQueryData(itemsQueryKeys.detail(itemId), updated);
      setSuccessMessage('Item updated successfully.');
      navigate(`${paths.items}/${itemId}`);
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
      // Server error handled by mutation onError
    }
  }

  if (query.isPending) {
    return (
      <Stack spacing={3}>
        <Skeleton height={40} width="30%" />
        <Skeleton height={200} />
        <Skeleton height={300} />
      </Stack>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Stack spacing={2} py={4}>
        <ErrorState message={query.error ? toApiError(query.error).message : 'Item not found'} />
        <Button variant="outlined" sx={{ alignSelf: 'flex-start' }} onClick={() => void query.refetch()}>
          Retry
        </Button>
      </Stack>
    );
  }

  const item = query.data;

  return (
    <Stack spacing={3}>
      <Box>
        <Typography component="h1" variant="h1">
          Edit {item.name}
        </Typography>
        <Typography color="text.secondary">
          Update item details, pricing, specifications or product image. Code: {item.itemCode}
        </Typography>
      </Box>

      <ItemImageSection item={item} onSuccess={(msg) => setSuccessMessage(msg)} />

      <ItemForm
        initialValues={item}
        isSubmitting={mutation.isPending}
        onSubmit={handleSubmit}
        onCancel={() => navigate(`${paths.items}/${itemId}`)}
        serverError={serverError}
      />

      <Snackbar
        open={successMessage !== null}
        autoHideDuration={4000}
        onClose={() => setSuccessMessage(null)}
      >
        <Alert severity="success" variant="filled" onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
