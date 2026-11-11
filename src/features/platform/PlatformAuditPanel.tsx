import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import { subscriptionsApi } from './subscriptions.api';
import { PlatformSection } from './PlatformSection';
import { PlatformPagination, PlatformTable } from './PlatformTable';

export function PlatformAuditPanel({ firmId }: { firmId: number | null }) {
  const [page, setPage] = useState(1);
  const audit = useQuery({ queryKey: ['platform', 'subscription-audit', firmId, page], queryFn: ({ signal }) => subscriptionsApi.audit(firmId, page, signal) });
  return (
    <PlatformSection title="Platform subscription audit" description="Audited changes include the responsible platform administrator and recorded change details.">
      <PlatformTable rowNumberStart={(page - 1) * 20 + 1} label="Platform audit" isLoading={audit.isPending} isError={audit.isError} isEmpty={!audit.data?.events.length} emptyMessage="No platform audit events" errorMessage="Platform audit could not be loaded." onRetry={() => { void audit.refetch(); }} columns={[{ key: 'date', label: 'Date' }, { key: 'kind', label: 'Operation' }, { key: 'actor', label: 'Actor' }, { key: 'firm', label: 'Firm' }, { key: 'details', label: 'Details' }]} pagination={<PlatformPagination label="Audit events" page={page} totalPages={Math.ceil((audit.data?.total ?? 0) / 20)} onChange={setPage} />}>
        {audit.data?.events.map((event) => (
          <TableRow key={event.id}>
            <TableCell>{new Date(event.createdAt).toLocaleString()}</TableCell><TableCell>{event.kind.replace(/_/g, ' ')}</TableCell><TableCell>{event.authorId}</TableCell><TableCell>{event.firmId ?? 'Platform'}</TableCell>
            <TableCell sx={{ minWidth: 220, maxWidth: 500 }}><details><summary>View changes</summary><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(event.payload, null, 2)}</pre></details></TableCell>
          </TableRow>
        ))}
      </PlatformTable>
    </PlatformSection>
  );
}
