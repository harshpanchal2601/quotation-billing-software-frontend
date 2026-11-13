import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { PERMISSIONS, useHasPermission } from '@features/auth';
import { apiClient, toApiError, type ApiSuccessResponse } from '@shared/api/apiClient';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { AppButton } from '@shared/ui/actions';
import { formatRecordValue } from '@shared/ui/display';
import { DetailFields } from '@shared/ui/layout';
import { RecordPagination, RecordTable, TableSkeleton, type TableSortState } from '@shared/ui/tables';
import type { FieldValues } from '../model/automation.types';

type HistoryRecord = { id: number; version: number; schemaSnapshot: Array<{ key: string; label: string }>; values: FieldValues; actorId: number; createdAt: string };
type HistoryPage = { history: HistoryRecord[]; pagination: { page: number; limit: number; hasMore: boolean } };
export function InvoiceFieldHistory({ scope, entityId }: { scope: string; entityId: number }) {
  const allowed = useHasPermission(PERMISSIONS.AUTOMATION_VIEW);
  const firmId = useFirmId();
  return allowed ? <History key={`${firmId}:${scope}:${entityId}`} firmId={firmId} scope={scope} entityId={entityId} /> : null;
}
function History({ firmId, scope, entityId }: { firmId: number | null | undefined; scope: string; entityId: number }) {
  const [open, setOpen] = useState(false); const [page, setPage] = useState(1);
  const [sort, setSort] = useState<TableSortState>({ sortBy: 'version', sortOrder: 'desc' });
  const query = useQuery({ queryKey: ['invoice-field-history', firmId, scope, entityId, 'paged', page, sort], queryFn: async ({ signal }) => (await apiClient.get<ApiSuccessResponse<HistoryPage>>(`/${scope}/${entityId}/custom-fields/history`, { signal, params: { page, ...sort } })).data.data, enabled: open });
  const records = query.data?.history ?? [];
  return <Stack spacing={2}>
    <AppButton aria-expanded={open} onClick={() => setOpen((value) => !value)} sx={{ alignSelf: 'flex-start' }}>Additional field history</AppButton>
    {open && query.isPending ? <TableSkeleton /> : null}
    {open && query.isError ? <Alert severity="error">{toApiError(query.error).message}<AppButton onClick={() => void query.refetch()}>Retry</AppButton></Alert> : null}
    {open && query.data ? <Stack spacing={1} aria-busy={query.isFetching}>
      <RecordTable rows={records} rowKey={(record) => record.id} label="Additional field history" emptyMessage="No additional field history has been recorded for this document." rowNumberStart={(page - 1) * 50 + 1}
        sorting={{ ...sort, fields: [{ key: 'version', label: 'Document version' }, { key: 'createdAt', label: 'Recorded on' }], onChange: (next) => { setSort(next); setPage(1); } }}
        columns={[
          { key: 'version', label: 'Document version', sortKey: 'version', render: (record) => record.version, minWidth: 144 },
          { key: 'values', label: 'Saved field values', minWidth: 320, render: (record) => record.schemaSnapshot.length > 0 ? <DetailFields columns={1} fields={record.schemaSnapshot.map((field) => ({ label: field.label, value: formatRecordValue(record.values[field.key]) }))} /> : 'No additional fields' },
          { key: 'actor', label: 'Recorded by', render: (record) => `User ${record.actorId}` },
          { key: 'createdAt', label: 'Recorded on', sortKey: 'createdAt', render: (record) => formatRecordValue(record.createdAt, 'createdAt'), noWrap: true },
        ]} />
      <RecordPagination pagination={{ total: query.data.pagination.hasMore ? -1 : (page - 1) * 50 + records.length, limit: 50, hasMore: !query.isFetching && query.data.pagination.hasMore }} page={page} change={setPage} />
    </Stack> : null}
  </Stack>;
}
