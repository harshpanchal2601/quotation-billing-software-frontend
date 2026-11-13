import { Link as MuiLink, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PERMISSIONS, useHasPermission } from '@features/auth';
import { toApiError } from '@shared/api/apiClient';
import { ErrorState } from '@shared/components/common/ErrorState';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { formatRecordStatus } from '@shared/ui/display';
import { AppButton } from '@shared/ui/actions';
import { RecordPagination, RecordTable, useTableSort } from '@shared/ui/tables';
import { DetailSection, PageContainer, PageHeader } from '@shared/ui/layout';
import { getReceivables } from './payments.api';
import { paymentsKeys } from './payments.queries';

export function ReceivablesPage() { return <PageContainer><PageHeader title="Receivables and ageing" description="Outstanding invoices and unapplied customer credit, separated by currency" /><ReceivablesPanel /></PageContainer>; }
export function ReceivablesPanel({ companyId, compact = false }: { companyId?: number; compact?: boolean }) {
  const firmId = useFirmId(); const canView = useHasPermission(PERMISSIONS.PAYMENTS_VIEW);
  return canView ? <Balances key={`${firmId}:${companyId}`} companyId={companyId} compact={compact} /> : null;
}
function Balances({ companyId, compact }: { companyId?: number; compact: boolean }) {
  const firmId = useFirmId(); const [page, setPage] = useState(1);
  const canViewInvoices = useHasPermission(PERMISSIONS.INVOICES_VIEW);
  const sorting = useTableSort([{ key: 'id', label: 'Record number' }, { key: 'documentNumber', label: 'Invoice number' }, { key: 'companyName', label: 'Customer' }, { key: 'dueDate', label: 'Due date' }, { key: 'currency', label: 'Currency' }, { key: 'outstanding', label: 'Outstanding amount' }], { onChange: () => setPage(1) });
  const params = { page, sortBy: sorting.sortBy, sortOrder: sorting.sortOrder, limit: compact ? 1 : 20, ...(companyId ? { companyId } : {}) };
  const query = useQuery({ queryKey: paymentsKeys.receivables(firmId, params), queryFn: ({ signal }) => getReceivables(params, signal), enabled: firmId != null });
  if (query.isError) return <ErrorState message={toApiError(query.error).message} onRetry={() => void query.refetch()} />;
  if (!query.data) return <Typography>Loading receivables…</Typography>;
  return <DetailSection title={companyId ? 'Customer balance' : 'Receivables'} description={`As of ${query.data.asOf} (${query.data.timezone})`}>
    <RecordTable rows={query.data.buckets} label="Ageing by currency" rowKey={(bucket) => `${bucket.currency}:${bucket.bucket}`} emptyMessage="No outstanding invoices." columns={[
      { key: 'currency', label: 'Currency', sortValue: (row) => row.currency, render: (row) => row.currency }, { key: 'bucket', label: 'Ageing bucket', sortValue: (row) => row.bucket, render: (row) => row.bucket.replace(/_/g, ' ') },
      { key: 'amount', label: 'Outstanding', align: 'right', sortValue: (row) => row.amount, render: (row) => row.amount }, { key: 'count', label: 'Invoices', align: 'right', sortValue: (row) => row.count, render: (row) => row.count },
    ]} />
    <RecordTable rows={query.data.customerCredits} label="Available customer credit" rowKey={(credit) => credit.currency} emptyMessage="No available customer credit." columns={[
      { key: 'currency', label: 'Currency', sortValue: (row) => row.currency, render: (row) => row.currency }, { key: 'amount', label: 'Available credit', align: 'right', sortValue: (row) => row.unapplied, render: (row) => row.unapplied },
    ]} />
    <AppButton component={Link} to={compact ? '/receivables' : companyId ? `/payments?companyId=${companyId}` : '/payments'}>{compact ? 'View receivables' : 'View customer receipts'}</AppButton>
    {!compact ? <><RecordTable rows={query.data.receivables} label="Outstanding invoices" sorting={sorting} rowNumberStart={(page - 1) * 20 + 1} rowKey={(invoice) => invoice.id} emptyMessage="No outstanding invoices match these filters." columns={[
      { key: 'documentNumber', label: 'Invoice', sortKey: 'documentNumber', render: (invoice) => canViewInvoices ? <MuiLink component={Link} to={`/invoices/${invoice.id}`}>{invoice.documentNumber}</MuiLink> : invoice.documentNumber },
      { key: 'companyName', label: 'Customer', sortKey: 'companyName', render: (invoice) => invoice.companyName }, { key: 'dueDate', label: 'Due', sortKey: 'dueDate', render: (invoice) => invoice.dueDate || 'No due date' },
      { key: 'outstanding', label: 'Outstanding', sortKey: 'outstanding', align: 'right', render: (invoice) => `${invoice.currency} ${invoice.outstanding}` }, { key: 'status', label: 'Settlement', render: (invoice) => `${formatRecordStatus(invoice.settlementStatus)}${invoice.overdue ? ' · Past due' : ''}` },
    ]} /><RecordPagination pagination={query.data.pagination} page={page} change={setPage} /></> : null}
  </DetailSection>;
}
