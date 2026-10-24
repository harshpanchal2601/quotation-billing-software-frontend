import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { toApiError } from '@shared/api/apiClient';
import { EmptyState } from '@shared/components/common/EmptyState';
import { ErrorState } from '@shared/components/common/ErrorState';
import { AppButton } from '@shared/ui/actions';
import { PageContainer, PageHeader } from '@shared/ui/layout';
import { AppTablePagination, DataTableShell, TableSkeleton } from '@shared/ui/tables';
import { listAuditLogsRequest } from './audit-logs.api';

export function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const query = useQuery({
    queryKey: ['audit-logs', page, limit],
    queryFn: () => listAuditLogsRequest(page, limit),
    placeholderData: keepPreviousData,
  });

  return (
    <PageContainer>
      <PageHeader title="Audit Logs" description="Review firm-scoped administrative and business activity." />
      <DataTableShell
        isLoading={query.isPending}
        isError={query.isError}
        isEmpty={query.data?.auditLogs.length === 0}
        loadingContent={<TableSkeleton />}
        errorContent={<Stack spacing={1}><ErrorState message={toApiError(query.error).message} /><AppButton sx={{ alignSelf: 'flex-start' }} onClick={() => void query.refetch()}>Retry</AppButton></Stack>}
        emptyContent={<EmptyState title="No audit activity" description="Audited changes for this firm will appear here." />}
        pagination={query.data && query.data.auditLogs.length > 0 ? <AppTablePagination count={query.data.pagination.total} page={page} rowsPerPage={limit} onPageChange={setPage} onRowsPerPageChange={(nextLimit) => { setLimit(nextLimit); setPage(1); }} /> : null}
      >
        {query.data?.auditLogs.length ? (
          <Table aria-label="Audit logs" sx={{ minWidth: 960 }}>
            <TableHead><TableRow><TableCell>Date</TableCell><TableCell>User</TableCell><TableCell>Action</TableCell><TableCell>Record</TableCell><TableCell>Changes</TableCell></TableRow></TableHead>
            <TableBody>{query.data.auditLogs.map((entry) => (
              <TableRow key={entry.id} hover>
                <TableCell>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(entry.createdAt))}</TableCell>
                <TableCell><Typography fontWeight={600}>{entry.user?.name ?? 'System or unavailable actor'}</Typography><Typography variant="caption" color="text.secondary">{entry.user?.email ?? entry.ipAddress ?? '—'}</Typography></TableCell>
                <TableCell>{entry.action.replace(/_/g, ' ')}</TableCell>
                <TableCell>{entry.entityType} #{entry.entityId}</TableCell>
                <TableCell><Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap', m: 0, maxWidth: 360 }}>{formatChanges(entry.oldValues, entry.newValues)}</Typography></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        ) : null}
      </DataTableShell>
    </PageContainer>
  );
}

function formatChanges(oldValues: unknown, newValues: unknown) {
  if (newValues !== null && newValues !== undefined) return JSON.stringify(newValues, null, 2);
  if (oldValues !== null && oldValues !== undefined) return JSON.stringify(oldValues, null, 2);
  return '—';
}
