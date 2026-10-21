import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate, useParams } from 'react-router-dom';

import { ErrorState } from '@shared/components/common/ErrorState';
import { SafeImage } from '@shared/components/common/SafeImage';
import { AppButton } from '@shared/ui/actions';
import { AppStatusChip } from '@shared/ui/display';
import { AppSnackbar, ServerErrorAlert } from '@shared/ui/feedback';
import { PageContainer } from '@shared/ui/layout';
import { DataTableShell } from '@shared/ui/tables';
import { paths } from '@shared/routing/paths';
import { getSafeListReturnPath } from '@shared/routing/returnNavigation';
import { toApiError } from '@shared/api/apiClient';
import { deleteItemRequest, getItemRequest, updateItemStatusRequest } from '../api/items.api';
import { ItemDeleteDialog, ItemStatusDialog } from '../components/ItemConfirmDialogs';
import { itemsQueryKeys } from '../model/items.query-keys';
import {
  formatCurrencyRate,
  formatGstRateLabel,
  formatItemSourceTypeLabel,
  formatReadableDate,
  resolveAssetUrl,
} from '../model/items.utils';

export function ItemDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const itemId = Number(id);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [statusTarget, setStatusTarget] = useState<boolean | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const query = useQuery({
    queryKey: itemsQueryKeys.detail(itemId),
    queryFn: () => getItemRequest(itemId),
    enabled: Number.isInteger(itemId) && itemId > 0,
  });

  const statusMutation = useMutation({
    mutationFn: (newStatus: boolean) => updateItemStatusRequest(itemId, newStatus),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: itemsQueryKeys.all });
      setStatusTarget(null);
      setSuccessMessage('Item status updated.');
    },
    onError: (error) => {
      setStatusTarget(null);
      setPageError(toApiError(error).message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteItemRequest(itemId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: itemsQueryKeys.all });
      setDeleteDialogOpen(false);
      navigate(returnPath, { replace: true });
    },
    onError: (error) => {
      setDeleteDialogOpen(false);
      setPageError(toApiError(error).message);
    },
  });

  if (query.isPending) {
    return (
      <PageContainer>
        <Skeleton height={40} width="40%" />
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
  const imageUrl = resolveAssetUrl(item.imageUrl);
  const isMutating = statusMutation.isPending || deleteMutation.isPending;
  const returnPath = getSafeListReturnPath(location, paths.items);

  return (
    <PageContainer>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ sm: 'center' }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Typography component="h1" variant="h1">
            {item.name}
          </Typography>
          <AppStatusChip
            label={item.isActive ? 'Active' : 'Inactive'}
            variant={item.isActive ? 'success' : 'neutral'}
          />
        </Stack>

        <Stack direction="row" spacing={1.5}>
          <AppButton component={RouterLink} to={returnPath} variant="outlined" startIcon={<ArrowBackOutlinedIcon />}>
            Back to Items
          </AppButton>
          <AppButton
            variant="outlined"
            onClick={() => setStatusTarget(!item.isActive)}
            disabled={isMutating}
          >
            {item.isActive ? 'Deactivate' : 'Activate'}
          </AppButton>
          <AppButton
            variant="contained"
            startIcon={<EditOutlinedIcon />}
            onClick={() => navigate(`${paths.items}/${itemId}/edit`, { state: { from: returnPath } })}
            disabled={isMutating}
          >
            Edit Item
          </AppButton>
          <AppButton
            variant="outlined"
            color="error"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={isMutating}
          >
            Delete
          </AppButton>
        </Stack>
      </Stack>

      <ServerErrorAlert message={pageError} onDismiss={() => setPageError(null)} />

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
        <Card variant="outlined" sx={{ width: { xs: '100%', md: 280 }, flexShrink: 0 }}>
          <CardContent sx={{ p: 3, textCenter: 'center' }}>
            <Stack spacing={2} alignItems="center">
              <Box
                sx={{
                  width: 200,
                  height: 200,
                  borderRadius: 2,
                  bgcolor: 'action.hover',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <SafeImage
                  src={imageUrl}
                  alt={item.name}
                  fallbackLabel="No product image"
                  imgSx={{ p: 1 }}
                  fallback={(
                    <Stack spacing={1} alignItems="center" color="text.secondary" role="img" aria-label="No product image">
                      <ImageOutlinedIcon sx={{ fontSize: 48 }} />
                      <Typography variant="body2">No product image</Typography>
                    </Stack>
                  )}
                />
              </Box>

              <Box textAlign="center">
                <Typography variant="caption" color="text.secondary" display="block">
                  Item Code
                </Typography>
                <Typography variant="h6" fontWeight={700} sx={{ fontFamily: 'monospace' }}>
                  {item.itemCode}
                </Typography>
              </Box>

              <Chip
                label={formatItemSourceTypeLabel(item.sourceType)}
                size="small"
                variant="outlined"
              />
            </Stack>
          </CardContent>
        </Card>

        <Stack spacing={3} flex={1}>
          <Card variant="outlined">
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={600} mb={2}>
                Item Information
              </Typography>

              <Stack spacing={2}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between">
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Product Category
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {item.category ? item.category.name : 'Uncategorised'}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Measurement Unit
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {item.measurementUnit.name} ({item.measurementUnit.symbol})
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Default Rate
                    </Typography>
                    <Typography variant="body1" fontWeight={700} color="primary.main">
                      {formatCurrencyRate(item.defaultRate)}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      GST Rate
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {formatGstRateLabel(item.gstRate)}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      HSN Code
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {item.hsnCode || '—'}
                    </Typography>
                  </Box>
                </Stack>

                {item.shortDescription ? (
                  <>
                    <Divider />
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Short Description
                      </Typography>
                      <Typography variant="body1">{item.shortDescription}</Typography>
                    </Box>
                  </>
                ) : null}

                {item.detailedDescription ? (
                  <>
                    <Divider />
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Detailed Description
                      </Typography>
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                        {item.detailedDescription}
                      </Typography>
                    </Box>
                  </>
                ) : null}
              </Stack>
            </CardContent>
          </Card>

          {item.specifications.length > 0 ? (
            <Card variant="outlined">
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={600} mb={2}>
                  Technical Specifications ({item.specifications.length})
                </Typography>

                <DataTableShell
                  isLoading={false}
                  isError={false}
                  isEmpty={false}
                  loadingContent={null}
                  errorContent={null}
                  emptyContent={null}
                  tableContainerProps={{ component: Paper, variant: 'outlined' }}
                >
                  <Table size="small" aria-label="Item specifications table">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Attribute Label</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Value</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {item.specifications.map((spec, index) => (
                        <TableRow key={index}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{spec.label}</TableCell>
                          <TableCell>{spec.value}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </DataTableShell>
              </CardContent>
            </Card>
          ) : null}

          <Card variant="outlined">
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Quotation Usage
                  </Typography>
                  <Typography variant="body1" fontWeight={700}>
                    Referenced in {item.quotationUsageCount} quotation line item(s)
                  </Typography>
                </Box>

                <Stack spacing={0.5} alignItems="flex-end">
                  <Typography variant="caption" color="text.secondary">
                    Created: {formatReadableDate(item.createdAt)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Updated: {formatReadableDate(item.updatedAt)}
                  </Typography>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Stack>

      <ItemStatusDialog
        item={statusTarget !== null ? item : null}
        isSubmitting={statusMutation.isPending}
        onClose={() => setStatusTarget(null)}
        onConfirm={() => {
          if (statusTarget !== null) statusMutation.mutate(statusTarget);
        }}
      />

      <ItemDeleteDialog
        item={deleteDialogOpen ? item : null}
        isDeleting={deleteMutation.isPending}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={() => {
          deleteMutation.mutate();
        }}
      />

      <AppSnackbar open={successMessage !== null} autoHideDuration={4000} message={successMessage} onClose={() => setSuccessMessage(null)} />
    </PageContainer>
  );
}
