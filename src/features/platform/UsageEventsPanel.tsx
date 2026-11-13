import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import { subscriptionsApi } from './subscriptions.api';
import { PlatformSection } from './PlatformSection';
import { PlatformPagination, PlatformTable } from './PlatformTable';

export function UsageEventsPanel({ firmId }: { firmId: number }) {
  const [page, setPage] = useState(1);
  const usage = useQuery({ queryKey: ['platform', 'usage-events', firmId, page], queryFn: ({ signal }) => subscriptionsApi.usageEvents(firmId, page, signal) });
  return (
    <PlatformSection title="Usage accounting history" description="Resource changes recorded for the selected firm.">
      <PlatformTable rowNumberStart={(page - 1) * 20 + 1} label="Usage events" isLoading={usage.isPending} isError={usage.isError} isEmpty={!usage.data?.events.length} emptyMessage="No usage events" errorMessage="Usage events could not be loaded." onRetry={() => { void usage.refetch(); }} columns={[{ key: 'date', label: 'Date' }, { key: 'resource', label: 'Resource' }, { key: 'delta', label: 'Change', align: 'right' }, { key: 'event', label: 'Event reference' }]} pagination={<PlatformPagination label="Usage events" page={page} totalPages={Math.ceil((usage.data?.total ?? 0) / 20)} onChange={setPage} />}>
        {usage.data?.events.map((event) => <TableRow key={event.id}><TableCell>{new Date(event.createdAt).toLocaleString()}</TableCell><TableCell>{event.resource}</TableCell><TableCell align="right">{event.delta}</TableCell><TableCell sx={{ overflowWrap: 'anywhere' }}>{event.eventId}</TableCell></TableRow>)}
      </PlatformTable>
    </PlatformSection>
  );
}
