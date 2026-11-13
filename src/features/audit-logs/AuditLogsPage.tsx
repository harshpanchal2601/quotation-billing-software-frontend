import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { useAuth } from '@features/auth';
import { toApiError } from '@shared/api/apiClient';
import { ErrorState } from '@shared/components/common/ErrorState';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { AppButton } from '@shared/ui/actions';
import { AppDialog } from '@shared/ui/dialogs';
import { formatRecordField, formatRecordStatus, formatRecordValue } from '@shared/ui/display';
import { DetailFields, DetailSection, PageContainer, PageHeader } from '@shared/ui/layout';
import { AppTablePagination, DataTableShell, RecordTable, TableSkeleton, useTableSort } from '@shared/ui/tables';
import { listAuditLogsRequest, type AuditLog } from './audit-logs.api';

const actionLabels: Record<string, string> = { CREATE: 'Created', UPDATE: 'Updated', DELETE: 'Deleted', LOGIN: 'Signed in', LOGOUT: 'Signed out' };
const timestamp = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
const changeFields = (value: unknown) => value !== null && typeof value === 'object' && !Array.isArray(value)
  ? Object.entries(value).map(([key, entry]) => ({ label: formatRecordField(key), value: formatRecordValue(entry, key) }))
  : [{ label: 'Recorded value', value: formatRecordValue(value) }];

export function AuditLogsPage() {
  const firmId = useFirmId(); const { user } = useAuth();
  return <AuditLogsWorkspace key={`${firmId}:${user?.id}`} />;
}

function AuditLogsWorkspace() {
  const firmId = useFirmId(); const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selected, setSelected] = useState<AuditLog | null>(null);
  const sorting = useTableSort([{ key: 'createdAt', label: 'Recorded date' }, { key: 'action', label: 'Action' }, { key: 'entityType', label: 'Record type' }, { key: 'entityId', label: 'Record identifier' }], { onChange: () => setPage(1) });
  const query = useQuery({
    queryKey: ['audit-logs', firmId, user?.id, page, limit, sorting.sortBy, sorting.sortOrder],
    queryFn: ({ signal }) => listAuditLogsRequest(page, limit, { sortBy: sorting.sortBy, sortOrder: sorting.sortOrder }, signal),
    enabled: firmId != null,
    placeholderData: keepPreviousData,
  });

  return <PageContainer>
    <PageHeader title="Audit Logs" description="Review who changed a firm record, when it changed and the values recorded at that time." />
    <DataTableShell wrapInTableContainer={false} isLoading={query.isPending || query.isPlaceholderData} isError={query.isError} isEmpty={false} loadingContent={<TableSkeleton />} errorContent={<ErrorState message={toApiError(query.error).message} onRetry={() => void query.refetch()} />} emptyContent={null} pagination={query.data ? <AppTablePagination count={query.data.pagination.total} page={page} rowsPerPage={limit} onPageChange={setPage} onRowsPerPageChange={(nextLimit) => { setLimit(nextLimit); setPage(1); }} /> : null}>
      <RecordTable rows={query.data?.auditLogs ?? []} sorting={sorting} rowNumberStart={(page - 1) * limit + 1} label="Audit logs" rowKey={(entry) => entry.id} emptyMessage="No audit activity has been recorded for this firm." columns={[
        { key: 'date', sortKey: 'createdAt', label: 'Date', render: (entry) => timestamp(entry.createdAt) },
        { key: 'user', label: 'User', render: (entry) => <Stack><Typography fontWeight={600}>{entry.user?.name ?? 'System or unavailable user'}</Typography><Typography variant="caption" color="text.secondary">{entry.user?.email ?? '—'}</Typography></Stack> },
        { key: 'action', sortKey: 'action', label: 'Action', render: (entry) => actionLabels[entry.action] ?? formatRecordStatus(entry.action) },
        { key: 'record', sortKey: 'entityType', label: 'Record', render: (entry) => <Stack><Typography>{formatRecordField(entry.entityType)}</Typography><Typography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere', maxWidth: 240 }}>#{entry.entityId}</Typography></Stack> },
        { key: 'changes', label: 'Changes', render: (entry) => <AppButton size="small" onClick={() => setSelected(entry)}>View changes</AppButton> },
      ]} />
    </DataTableShell>
    <AppDialog open={selected !== null} title={selected ? `Activity #${selected.id}` : 'Activity details'} onClose={() => setSelected(null)} fullWidth maxWidth="md" actions={<AppButton onClick={() => setSelected(null)}>Close</AppButton>}>
      {selected ? <Stack spacing={3}>
        <DetailSection title="Activity details"><DetailFields fields={[
          { label: 'Action', value: actionLabels[selected.action] ?? formatRecordStatus(selected.action) },
          { label: 'Recorded', value: timestamp(selected.createdAt) },
          { label: 'Record type', value: formatRecordField(selected.entityType) },
          { label: 'Record identifier', value: selected.entityId },
          { label: 'User', value: selected.user?.name ?? 'System or unavailable user' },
          { label: 'User email', value: selected.user?.email ?? '—' },
          { label: 'Network address', value: selected.ipAddress ?? 'Not recorded' },
        ]} /></DetailSection>
        {selected.oldValues != null ? <DetailSection title="Before the change"><DetailFields fields={changeFields(selected.oldValues)} /></DetailSection> : null}
        {selected.newValues != null ? <DetailSection title="After the change"><DetailFields fields={changeFields(selected.newValues)} /></DetailSection> : null}
        {selected.oldValues == null && selected.newValues == null ? <Typography>No field values were recorded for this activity.</Typography> : null}
        <Box component="details"><Box component="summary" sx={{ cursor: 'pointer', color: 'text.secondary' }}>Original audit data</Box><Box component="pre" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: '0.75rem' }}>{JSON.stringify({ oldValues: selected.oldValues, newValues: selected.newValues }, null, 2)}</Box></Box>
      </Stack> : null}
    </AppDialog>
  </PageContainer>;
}
