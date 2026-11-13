import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Stack from '@mui/material/Stack';
import { ErrorState } from '@shared/components/common/ErrorState';
import { AppButton } from '@shared/ui/actions';
import { AppDialog } from '@shared/ui/dialogs';
import { formatBusinessAction, formatRecordField, formatRecordValue } from '@shared/ui/display';
import { DetailFields, DetailSection } from '@shared/ui/layout';
import { RecordPagination, RecordTable, TableSkeleton, useTableSort } from '@shared/ui/tables';
import { subscriptionsApi } from './subscriptions.api';
import type { SubscriptionAuditEvent } from './subscriptions.types';
import { PlatformSection } from './PlatformSection';

export function PlatformAuditPanel({ firmId }: { firmId: number | null }) {
  return <AuditHistory key={firmId ?? 'platform'} firmId={firmId} />;
}
function AuditHistory({ firmId }: { firmId: number | null }) {
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<SubscriptionAuditEvent | null>(null);
  const sorting = useTableSort([{ key: 'id', label: 'Record number' }, { key: 'createdAt', label: 'Date' }, { key: 'kind', label: 'Operation' }, { key: 'authorId', label: 'Administrator number' }], { paramPrefix: 'platformAudit', defaultSortBy: 'id', onChange: () => setPage(1) });
  const sort = { sortBy: sorting.sortBy, sortOrder: sorting.sortOrder };
  const audit = useQuery({ queryKey: ['platform', 'subscription-audit', firmId, page, sort], queryFn: ({ signal }) => subscriptionsApi.audit(firmId, page, signal, sort) });
  const entries: Array<[string, unknown]> = viewing?.payload != null && typeof viewing.payload === 'object' ? Object.entries(viewing.payload) : [['value', viewing?.payload]];
  return <PlatformSection title="Platform subscription audit" description="Audited changes include the responsible platform administrator and recorded change details.">
    {audit.isPending ? <TableSkeleton /> : null}
    {audit.isError ? <ErrorState message="Platform audit could not be loaded." onRetry={() => void audit.refetch()} /> : null}
    {audit.data ? <Stack spacing={1} aria-busy={audit.isFetching}>
      <RecordTable rows={audit.data.events} rowKey={(event) => event.id} label="Platform audit" emptyMessage="No platform audit events have been recorded." rowNumberStart={(page - 1) * 20 + 1} sorting={sorting} columns={[
        { key: 'date', sortKey: 'createdAt', label: 'Date', noWrap: true, render: (event) => formatRecordValue(event.createdAt, 'createdAt') },
        { key: 'kind', sortKey: 'kind', label: 'Operation', minWidth: 220, render: (event) => formatBusinessAction(event.kind) },
        { key: 'actor', sortKey: 'authorId', label: 'Administrator', render: (event) => `User #${event.authorId}` },
        { key: 'firm', label: 'Firm', render: (event) => event.firmId == null ? 'Platform' : `Firm #${event.firmId}` },
        { key: 'details', label: 'Details', render: (event) => <AppButton size="small" onClick={() => setViewing(event)}>View changes</AppButton> },
      ]} />
      <RecordPagination pagination={{ total: audit.data.total, limit: 20 }} page={page} change={setPage} />
    </Stack> : null}
    <AppDialog open={viewing !== null} title="Platform change details" fullWidth maxWidth="md" showCloseButton onClose={() => setViewing(null)} actions={<AppButton onClick={() => setViewing(null)}>Close</AppButton>}>
      {viewing ? <Stack spacing={2}>
        <DetailSection title="Change summary"><DetailFields fields={[{ label: 'Operation', value: formatBusinessAction(viewing.kind) }, { label: 'Recorded on', value: formatRecordValue(viewing.createdAt, 'createdAt') }, { label: 'Administrator', value: `User #${viewing.authorId}` }, { label: 'Firm', value: viewing.firmId == null ? 'Platform' : `Firm #${viewing.firmId}` }]} /></DetailSection>
        <DetailSection title="Recorded changes"><DetailFields columns={1} fields={entries.map(([key, value]) => ({ label: formatRecordField(key), value: formatRecordValue(value, key) }))} /></DetailSection>
      </Stack> : null}
    </AppDialog>
  </PlatformSection>;
}
