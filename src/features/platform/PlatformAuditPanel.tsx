import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { AppButton } from '@shared/ui/actions';
import { ErrorState } from '@shared/components/common/ErrorState';
import { subscriptionsApi } from './subscriptions.api';

export function PlatformAuditPanel({ firmId }: { firmId: number | null }) {
  const [page, setPage] = useState(1);
  const audit = useQuery({ queryKey: ['platform', 'subscription-audit', firmId, page], queryFn: ({ signal }) => subscriptionsApi.audit(firmId, page, signal) });
  return <Stack spacing={2}><Typography variant="h6">Platform subscription audit</Typography>
    {audit.isError ? <ErrorState message="Platform audit could not be loaded." onRetry={() => { void audit.refetch(); }} /> : null}
    {audit.data?.events.map((event) => <details key={event.id}><summary>{new Date(event.createdAt).toLocaleString()} · {event.kind} · actor {event.authorId}{event.firmId ? ` · firm ${event.firmId}` : ''}</summary><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(event.payload, null, 2)}</pre></details>)}
    <Stack direction="row" spacing={2}><AppButton disabled={page === 1} onClick={() => setPage(page - 1)}>Previous events</AppButton><Typography>Page {page}</Typography><AppButton disabled={page * 20 >= (audit.data?.total ?? 0)} onClick={() => setPage(page + 1)}>Next events</AppButton></Stack>
  </Stack>;
}
