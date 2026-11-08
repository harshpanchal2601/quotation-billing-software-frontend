import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { PERMISSIONS, useHasPermission } from '@features/auth';
import { apiClient, toApiError, type ApiSuccessResponse } from '@shared/api/apiClient';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { AppButton } from '@shared/ui/actions';
import type { FieldValues } from '../model/automation.types';

export function InvoiceFieldHistory({ scope, entityId }: { scope: string; entityId: number }) {
  const allowed = useHasPermission(PERMISSIONS.AUTOMATION_VIEW);
  return allowed ? <History scope={scope} entityId={entityId} /> : null;
}
function History({ scope, entityId }: { scope: string; entityId: number }) {
  const firmId = useFirmId(); const [open, setOpen] = useState(false); const [page, setPage] = useState(1);
  const query = useQuery({ queryKey: ['invoice-field-history', firmId, scope, entityId, page], queryFn: async () => (await apiClient.get<ApiSuccessResponse<{ history: Array<{ id: number; version: number; schemaSnapshot: Array<{ key: string; label: string }>; values: FieldValues; actorId: number; createdAt: string }> }>>(`/${scope}/${entityId}/custom-fields/history?page=${page}`)).data.data.history, enabled: open });
  return <Stack spacing={1}><AppButton aria-expanded={open} onClick={() => setOpen((value) => !value)}>Additional field history</AppButton>{open && query.isPending ? <Typography>Loading value history…</Typography> : null}{open && query.isError ? <Alert severity="error">{toApiError(query.error).message}<AppButton onClick={() => void query.refetch()}>Retry</AppButton></Alert> : null}{open ? query.data?.map((record) => <Stack key={record.id}><Typography>Document version {record.version} · User {record.actorId} · {new Date(record.createdAt).toLocaleString()}</Typography>{record.schemaSnapshot.map((field) => <Typography variant="body2" key={field.key}>{field.label}: {String(record.values[field.key] ?? '')}</Typography>)}</Stack>) : null}{open ? <Stack direction="row"><AppButton disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</AppButton><AppButton disabled={(query.data?.length ?? 0) < 50} onClick={() => setPage((value) => value + 1)}>More history</AppButton></Stack> : null}</Stack>;
}
