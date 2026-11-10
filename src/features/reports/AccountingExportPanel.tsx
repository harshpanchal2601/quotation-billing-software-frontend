import { Alert, Stack, TextField, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { PERMISSIONS, useAuth, useHasPermission } from '@features/auth';
import { apiClient, toApiError, type ApiSuccessResponse } from '@shared/api/apiClient';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { AppButton } from '@shared/ui/actions';

type Mapping = { receivables: string; sales: string; outputTax: string; rounding: string };
type Config = { mapping: null | { version: number; mapping: Mapping } };
const labels = { receivables: 'Receivables account', sales: 'Sales account', outputTax: 'Output tax account', rounding: 'Rounding account' } as const;
export function AccountingExportPanel({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const firmId = useFirmId(); const { user } = useAuth(); const cache = useQueryClient(); const canManage = useHasPermission(PERMISSIONS.ACCOUNTING_MANAGE);
  const key = ['accounting-mapping', firmId, user?.id];
  const current = useQuery({ queryKey: key, queryFn: async ({ signal }) => (await apiClient.get<ApiSuccessResponse<Config>>('/accounting-exports/mapping', { signal })).data.data, enabled: firmId != null, retry: false });
  const [mapping, setMapping] = useState<Mapping>({ receivables: '', sales: '', outputTax: '', rounding: '' });
  useEffect(() => { if (current.data?.mapping) setMapping(current.data.mapping.mapping); }, [current.data]);
  const save = useMutation({ mutationFn: async () => (await apiClient.post<ApiSuccessResponse<Config>>('/accounting-exports/mapping', { expectedVersion: current.data?.mapping?.version ?? 0, mapping })).data.data, onSuccess: (result) => { cache.setQueryData(key, result); } });
  const download = useMutation({ mutationFn: async () => {
    const result = await apiClient.get<Blob>('/accounting-exports/export.csv', { params: { dateFrom, dateTo, mappingVersion: current.data!.mapping!.version }, responseType: 'blob', timeout: 60_000 });
    const url = URL.createObjectURL(result.data); const link = document.createElement('a'); link.href = url; link.download = `billing-journal-${dateFrom}-${dateTo}.csv`; document.body.appendChild(link);
    try { link.click(); } finally { link.remove(); URL.revokeObjectURL(url); }
  } });
  return <Stack spacing={2}><Typography component="h2" variant="h2">Billing journal export</Typography><Typography>Exports immutable invoice, credit-note and debit-note issue events and their void reversals in the applied UTC date range. Each event balances in its original currency. This export excludes receipts, purchasing, expenses and stock journals. Your accountant must approve the account mapping before using it.</Typography>
    {current.data?.mapping ? <Typography>Published mapping version {current.data.mapping.version}</Typography> : <Alert severity="info">An explicit account mapping is required before export.</Alert>}
    {canManage ? <Stack component="form" spacing={1} onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>{(Object.keys(labels) as Array<keyof Mapping>).map((field) => <TextField key={field} label={labels[field]} value={mapping[field]} required disabled={save.isPending || current.isFetching} inputProps={{ maxLength: 100 }} onChange={(event) => setMapping({ ...mapping, [field]: event.target.value })} />)}<AppButton type="submit" disabled={save.isPending || !current.isSuccess || Object.values(mapping).some((value) => !value.trim())}>Publish new mapping version</AppButton></Stack> : null}
    <AppButton disabled={!current.data?.mapping || current.isFetching || download.isPending} onClick={() => download.mutate()}>Export billing journal CSV</AppButton>
    {[current.error, save.error, download.error].filter(Boolean).map((error, index) => <Alert key={index} severity="error">{toApiError(error).message}</Alert>)}
    {download.isSuccess ? <Alert severity="success">Journal exported with source-event identifiers and mapping version. Deduplicate source-event identifiers when importing into accounting software.</Alert> : null}
  </Stack>;
}
