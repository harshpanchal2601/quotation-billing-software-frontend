import { Alert, Stack, TextField, Typography } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { PERMISSIONS, useHasPermission } from '@features/auth';
import { getQuotationRequest } from '@features/quotations/api/quotations.api';
import { toApiError } from '@shared/api/apiClient';
import { CommandForm } from '@shared/forms/CommandForm';
import { getCurrentListReturnState } from '@shared/routing/returnNavigation';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { AppButton } from '@shared/ui/actions';
import { formatRecordStatus } from '@shared/ui/display';
import { PageContainer, PageHeader } from '@shared/ui/layout';
import { RecordPagination, RecordTable, useTableSort } from '@shared/ui/tables';
import { createSalesOrder, listSalesOrders, salesOrderKeys } from './sales-orders.api';

export function SalesOrdersPage() { const firmId = useFirmId(); return <SalesOrdersList key={firmId} />; }
function SalesOrdersList() {
  const firmId = useFirmId(); const cache = useQueryClient(); const location = useLocation(); const [params, setParams] = useSearchParams();
  const canCreate = useHasPermission(PERMISSIONS.SALES_ORDERS_MANAGE);
  const sourceRevisionId = Number(params.get('sourceRevisionId'));
  const hasSource = params.has('sourceRevisionId');
  const validSourceId = Number.isSafeInteger(sourceRevisionId) && sourceRevisionId > 0;
  const source = useQuery({ queryKey: [...salesOrderKeys.firm(firmId), 'source-quotation', sourceRevisionId], queryFn: () => getQuotationRequest(sourceRevisionId), enabled: firmId != null && canCreate && hasSource && validSourceId });
  const requestedPage = Number(params.get('page')); const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 && requestedPage <= 100000 ? requestedPage : 1;
  const search = params.get('search') ?? '';
  const sorting = useTableSort([{ key: 'id', label: 'Record number' }, { key: 'orderNumber', label: 'Order number' }, { key: 'status', label: 'Status' }, { key: 'createdAt', label: 'Created date' }]);
  const change = (patch: Record<string, string | number>) => setParams((current) => { const next = new URLSearchParams(current); for (const [name, value] of Object.entries(patch)) { if (String(value)) next.set(name, String(value)); else next.delete(name); } return next; }, { replace: true });
  const query = useQuery({ queryKey: [...salesOrderKeys.firm(firmId), 'list', page, search, sorting.sortBy, sorting.sortOrder], queryFn: ({ signal }) => listSalesOrders({ page, limit: 20, search, sortBy: sorting.sortBy, sortOrder: sorting.sortOrder }, signal), enabled: firmId != null });
  const returnState = getCurrentListReturnState(location.pathname, location.search);
  return <PageContainer><PageHeader title="Sales orders" description="Manage accepted quotations, deliveries and completed services" actions={canCreate ? <>
    <AppButton component={Link} to="/quotations?status=ACCEPTED" variant="outlined">Create sales order</AppButton>
    {hasSource ? <CommandForm key={params.get('sourceRevisionId')} dialog initialOpen hideTrigger onClosed={() => change({ sourceRevisionId: '' })} title="Create sales order" label="Create order" successMessage="Sales order created." isSubmitDisabled={!validSourceId || source.isPending || source.isError || source.data?.status !== 'ACCEPTED'} saved={() => cache.invalidateQueries({ queryKey: salesOrderKeys.firm(firmId) }, { throwOnError: true })} submit={(_, key) => createSalesOrder(sourceRevisionId, key)}>
      {!validSourceId ? <Alert severity="error">Choose an accepted quotation from the quotations list.</Alert> : source.isError ? <Alert severity="error" action={<AppButton onClick={() => void source.refetch()}>Retry quotation</AppButton>}>{toApiError(source.error).message}</Alert> : source.isPending ? <Typography role="status">Loading the selected quotation…</Typography> : <Stack spacing={1}>
        <Typography variant="subtitle2">Accepted quotation</Typography>
        <Typography fontWeight={600}>{source.data.quotationNumber}</Typography>
        <Typography>{source.data.companyNameSnapshot} · Revision {source.data.revisionNumber}</Typography>
        {source.data.status !== 'ACCEPTED' ? <Alert severity="warning">This quotation is no longer accepted. Choose an accepted quotation to create an order.</Alert> : <Typography color="text.secondary">The agreed items, prices and taxes will be kept. Record deliveries or completed services on the order before invoicing.</Typography>}
      </Stack>}
    </CommandForm> : null}
  </> : undefined} />
    <TextField label="Search order number" value={search} onChange={(event) => change({ search: event.target.value, page: 1 })} />
    {query.isError ? <Alert severity="error" action={<AppButton onClick={() => void query.refetch()}>Retry orders</AppButton>}>{toApiError(query.error).message}</Alert> : null}
    {query.isPending ? <Typography role="status">Loading orders…</Typography> : null}
    {query.data ? <><RecordTable rows={query.data.orders} sorting={sorting} rowNumberStart={(page - 1) * 20 + 1} label="Sales orders" rowKey={(order) => order.id} emptyMessage="No sales orders match these filters. Create an order from an accepted quotation." columns={[
      { key: 'number', sortKey: 'orderNumber', label: 'Order', render: (order) => order.orderNumber }, { key: 'customer', label: 'Customer', render: (order) => order.company.name }, { key: 'status', sortKey: 'status', label: 'Status', render: (order) => formatRecordStatus(order.status) }, { key: 'actions', label: 'Actions', render: (order) => <AppButton component={Link} to={`/sales-orders/${order.id}`} state={returnState}>Open {order.orderNumber}</AppButton> },
    ]} /><RecordPagination pagination={query.data.pagination} page={page} change={(value) => change({ page: value })} /></> : null}
  </PageContainer>;
}
