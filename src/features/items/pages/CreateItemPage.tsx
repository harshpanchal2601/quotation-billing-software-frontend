import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { paths } from '@app/router/routeConfig';
import { toApiError } from '@shared/api/apiClient';
import { createItemRequest } from '../api/items.api';

import { ItemForm } from '../components/ItemForm';
import { itemsQueryKeys } from '../items.query-keys';
import type { ItemFormValues } from '../items.schema';

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
    <Stack spacing={3}>
      <Box>
        <Typography component="h1" variant="h1">
          Add Item
        </Typography>
        <Typography color="text.secondary">
          Create a new product or service item for quotations.
        </Typography>
      </Box>

      <ItemForm
        isSubmitting={mutation.isPending}
        onSubmit={handleSubmit}
        onCancel={() => navigate(paths.items)}
        serverError={serverError}
      />

      <Snackbar
        open={snackbarMessage !== null}
        autoHideDuration={4000}
        onClose={() => setSnackbarMessage(null)}
      >
        <Alert severity="success" variant="filled" onClose={() => setSnackbarMessage(null)}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
