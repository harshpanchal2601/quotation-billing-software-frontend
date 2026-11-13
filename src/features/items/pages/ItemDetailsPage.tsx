import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate, useParams } from 'react-router-dom';

import { ErrorState } from '@shared/components/common/ErrorState';
import { SafeImage } from '@shared/components/common/SafeImage';
import { AppButton } from '@shared/ui/actions';
import { AppStatusChip } from '@shared/ui/display';
import { AppSnackbar, ServerErrorAlert } from '@shared/ui/feedback';
import { DetailFields, DetailHeader, DetailSection, PageContainer } from '@shared/ui/layout';
import { RecordTable } from '@shared/ui/tables';
import { paths } from '@shared/routing/paths';
import { getSafeListReturnPath } from '@shared/routing/returnNavigation';
import { toApiError } from '@shared/api/apiClient';
import { PERMISSIONS, useHasPermission } from '@features/auth';
import { ItemStockPanel } from '@features/inventory';
import { TenantFieldsPanel } from '@features/automation';
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
  const canManage = useHasPermission(PERMISSIONS.ITEMS_MANAGE);

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
      <DetailHeader title={item.name} description={item.itemCode}
        status={<AppStatusChip label={item.isActive ? 'Active' : 'Inactive'} variant={item.isActive ? 'success' : 'neutral'} />}
        backAction={<AppButton component={RouterLink} to={returnPath} variant="outlined" startIcon={<ArrowBackOutlinedIcon />}>Back to Items</AppButton>}
        actionLabel="Item actions" actions={canManage ? <>
          <AppButton variant="contained" startIcon={<EditOutlinedIcon />} onClick={() => navigate(`${paths.items}/${itemId}/edit`, { state: { from: returnPath } })} disabled={isMutating}>Edit Item</AppButton>
          <AppButton variant="outlined" onClick={() => setStatusTarget(!item.isActive)} disabled={isMutating}>{item.isActive ? 'Deactivate' : 'Activate'}</AppButton>
          <AppButton variant="outlined" color="error" onClick={() => setDeleteDialogOpen(true)} disabled={isMutating}>Delete</AppButton>
        </> : undefined} />
      <ServerErrorAlert message={pageError} onDismiss={() => setPageError(null)} />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: '260px minmax(0, 1fr)' }, gap: 2, alignItems: 'start' }}>
        <DetailSection title="Product image">
          <Stack spacing={2} alignItems="center">
            <Box sx={{ width: '100%', maxWidth: 200, aspectRatio: '1', borderRadius: 2, bgcolor: 'action.hover', display: 'grid', placeItems: 'center', overflow: 'hidden', border: 1, borderColor: 'divider' }}>
              <SafeImage src={imageUrl} alt={item.name} fallbackLabel="No product image" imgSx={{ p: 1 }} fallback={<Stack spacing={1} alignItems="center" color="text.secondary" role="img" aria-label="No product image"><ImageOutlinedIcon sx={{ fontSize: 48 }} /><Typography variant="body2">No product image</Typography></Stack>} />
            </Box>
            <Chip label={formatItemSourceTypeLabel(item.sourceType)} size="small" variant="outlined" />
          </Stack>
        </DetailSection>
        <Stack spacing={2} minWidth={0}>
          <DetailSection title="Item information"><DetailFields fields={[
            { label: 'Item code', value: item.itemCode }, { label: 'Item type', value: item.kind === 'SERVICE' ? 'Service' : 'Goods' },
            { label: 'Category', value: item.category?.name ?? 'Uncategorised' }, { label: 'Measurement unit', value: `${item.measurementUnit.name} (${item.measurementUnit.symbol})` },
            { label: 'Default rate', value: formatCurrencyRate(item.defaultRate) }, { label: 'GST rate', value: formatGstRateLabel(item.gstRate) },
            { label: item.kind === 'SERVICE' ? 'SAC code' : 'HSN code', value: item.hsnCode || '—' },
          ]} /></DetailSection>
          {item.shortDescription || item.detailedDescription ? <DetailSection title="Description"><DetailFields columns={1} fields={[
            ...(item.shortDescription ? [{ label: 'Short description', value: item.shortDescription }] : []),
            ...(item.detailedDescription ? [{ label: 'Detailed description', value: item.detailedDescription }] : []),
          ]} /></DetailSection> : null}
          {item.specifications.length > 0 ? <DetailSection title="Technical specifications"><RecordTable rows={item.specifications} label="Item specifications" rowKey={(spec) => spec.label} columns={[
            { key: 'label', label: 'Attribute', sortValue: (spec) => spec.label, render: (spec) => spec.label },
            { key: 'value', label: 'Value', sortValue: (spec) => spec.value, render: (spec) => spec.value },
          ]} /></DetailSection> : null}
          <DetailSection title="Record information"><DetailFields fields={[
            { label: 'Quotation line references', value: item.quotationUsageCount },
            { label: 'Created', value: formatReadableDate(item.createdAt) }, { label: 'Last updated', value: formatReadableDate(item.updatedAt) },
          ]} /></DetailSection>
        </Stack>
      </Box>
      <ItemStockPanel key={`stock:${item.id}`} itemId={item.id} kind={item.kind} stockTracking={item.stockTracking} changed={() => queryClient.invalidateQueries({ queryKey: itemsQueryKeys.detail(item.id) })} />
      <TenantFieldsPanel key={`fields:${item.id}`} entity="ITEM" entityId={item.id} editable={canManage} />

      {canManage ? <ItemStatusDialog
        item={statusTarget !== null ? item : null}
        isSubmitting={statusMutation.isPending}
        onClose={() => setStatusTarget(null)}
        onConfirm={() => {
          if (statusTarget !== null) statusMutation.mutate(statusTarget);
        }}
      /> : null}

      {canManage ? <ItemDeleteDialog
        item={deleteDialogOpen ? item : null}
        isDeleting={deleteMutation.isPending}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={() => {
          deleteMutation.mutate();
        }}
      /> : null}

      <AppSnackbar open={successMessage !== null} autoHideDuration={4000} message={successMessage} onClose={() => setSuccessMessage(null)} />
    </PageContainer>
  );
}
