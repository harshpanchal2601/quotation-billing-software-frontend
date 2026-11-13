import { Alert, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { PERMISSIONS, useHasPermission } from '@features/auth';
import { toApiError } from '@shared/api/apiClient';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { listPurchases, purchasingKeys } from './purchasing.api';
export function SupplierPurchasingPanel({ supplierId }: { supplierId: number }) {
  const firmId = useFirmId(); const ordersAllowed = useHasPermission(PERMISSIONS.PURCHASING_VIEW); const billsAllowed = useHasPermission(PERMISSIONS.SUPPLIER_BILLS_VIEW);
  const orders = useQuery({ queryKey: [...purchasingKeys.firm(firmId), 'supplier-orders', supplierId], queryFn: ({ signal }) => listPurchases('orders', { supplierId, page: 1, limit: 10 }, signal), enabled: firmId != null && ordersAllowed });
  const bills = useQuery({ queryKey: [...purchasingKeys.firm(firmId), 'supplier-bills', supplierId], queryFn: ({ signal }) => listPurchases('bills', { supplierId, page: 1, limit: 10 }, signal), enabled: firmId != null && billsAllowed });
  if (!ordersAllowed && !billsAllowed) return null;
  return <Stack spacing={1}><Typography variant="h6">Supplier purchasing history</Typography>{[orders.error, bills.error].filter(Boolean).map((error, index) => <Alert severity="error" key={index}>{toApiError(error).message}</Alert>)}{orders.data?.records.map((row) => <Typography key={`order-${row.id}`}><Link to={`/purchasing?tab=orders&supplierId=${supplierId}&documentId=${row.id}`}>{row.orderNumber}</Link> · {row.status} · {row.currency} {row.total}</Typography>)}{bills.data?.records.map((row) => <Typography key={`bill-${row.id}`}><Link to={`/purchasing?tab=bills&supplierId=${supplierId}&documentId=${row.id}`}>{row.supplierReference}</Link> · {row.status} · {row.currency} {row.total}</Typography>)}<Link to={`/purchasing?supplierId=${supplierId}&tab=${ordersAllowed ? 'orders' : 'bills'}`}>View all supplier purchasing</Link></Stack>;
}
