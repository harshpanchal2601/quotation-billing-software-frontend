import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { AppButton } from '@shared/ui/actions';
import { ErrorState } from '@shared/components/common/ErrorState';
import { subscriptionsApi } from './subscriptions.api';

export function UsageEventsPanel({ firmId }: { firmId: number }) {
  const [page, setPage] = useState(1);
  const usage = useQuery({ queryKey: ['platform', 'usage-events', firmId, page], queryFn: ({ signal }) => subscriptionsApi.usageEvents(firmId, page, signal) });
  return <Stack spacing={2}><Typography variant="h6">Usage accounting history</Typography>
    {usage.isError ? <ErrorState message="Usage events could not be loaded." onRetry={() => { void usage.refetch(); }} /> : null}
    {usage.data?.events.map((event) => <Typography key={event.id}>{new Date(event.createdAt).toLocaleString()} · {event.resource} · {event.delta} · {event.eventId}</Typography>)}
    <Stack direction="row" spacing={2}><AppButton disabled={page === 1} onClick={() => setPage(page - 1)}>Previous usage</AppButton><Typography>Page {page}</Typography><AppButton disabled={page * 20 >= (usage.data?.total ?? 0)} onClick={() => setPage(page + 1)}>Next usage</AppButton></Stack>
  </Stack>;
}
