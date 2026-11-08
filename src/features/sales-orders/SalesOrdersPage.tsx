import { Alert, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PERMISSIONS, useHasPermission } from '@features/auth';
import { toApiError } from '@shared/api/apiClient';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { AppButton } from '@shared/ui/actions';
import { PageContainer, PageHeader } from '@shared/ui/layout';
import { createSalesOrder, listSalesOrders, salesOrderKeys } from './sales-orders.api';

export function SalesOrdersPage() { const firmId = useFirmId(); return <SalesOrdersList key={firmId} />; }
function SalesOrdersList() {
  const firmId = useFirmId(); const cache = useQueryClient(); const navigate = useNavigate(); const [params] = useSearchParams();
  const canCreate = useHasPermission(PERMISSIONS.SALES_ORDERS_MANAGE); const [page, setPage] = useState(1); const [search, setSearch] = useState(''); const [key] = useState(() => crypto.randomUUID());
  const query = useQuery({ queryKey: [...salesOrderKeys.firm(firmId), 'list', page, search], queryFn: ({ signal }) => listSalesOrders({ page, limit: 20, search }, signal), enabled: firmId != null });
  const create = useMutation({ mutationFn: (id: number) => createSalesOrder(id, key), onSuccess: (order) => { void cache.invalidateQueries({ queryKey: salesOrderKeys.firm(firmId) }); navigate(`/sales-orders/${order.id}`); } });
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); create.mutate(Number(new FormData(event.currentTarget).get('revisionId'))); }
  return <PageContainer><PageHeader title="Sales orders" description="Exact accepted quotation snapshots and delivery or service completion" />
    {query.isError || create.isError ? <Alert severity="error">{toApiError(query.error ?? create.error).message}</Alert> : null}
    {canCreate ? <Stack component="form" onSubmit={submit} direction="row" spacing={2}><TextField name="revisionId" label="Accepted quotation revision ID" type="number" required defaultValue={params.get('sourceRevisionId') ?? ''} inputProps={{ min: 1 }} /><AppButton type="submit" variant="contained" disabled={create.isPending}>Create order</AppButton></Stack> : null}
    <TextField label="Search order number" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
    {query.isPending ? <Typography>Loading orders…</Typography> : null}
    <Table aria-label="Sales orders"><TableHead><TableRow><TableCell>Order</TableCell><TableCell>Customer</TableCell><TableCell>Status</TableCell></TableRow></TableHead><TableBody>{query.data?.orders.map((order) => <TableRow key={order.id}><TableCell><Link to={`/sales-orders/${order.id}`}>{order.orderNumber}</Link></TableCell><TableCell>{order.company.name}</TableCell><TableCell>{order.status}</TableCell></TableRow>)}</TableBody></Table>
    {query.data?.orders.length === 0 ? <Typography>No orders found.</Typography> : null}
    <Stack direction="row"><AppButton disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</AppButton><Typography>Page {page}</Typography><AppButton disabled={!query.data || page * 20 >= query.data.pagination.total} onClick={() => setPage(page + 1)}>Next</AppButton></Stack>
  </PageContainer>;
}
