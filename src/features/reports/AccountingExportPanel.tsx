import { downloadBlob } from '@shared/api/download';
import { Alert, Stack, TextField, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { PERMISSIONS, useAuth, useHasPermission } from '@features/auth';
import { toApiError } from '@shared/api/apiClient';
import { ErrorState } from '@shared/components/common/ErrorState';
import { CommandForm } from '@shared/forms/CommandForm';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { AppButton } from '@shared/ui/actions';
import { useNotification } from '@shared/ui/feedback';
import { DetailActions, DetailFields, DetailSection } from '@shared/ui/layout';
import { downloadAccountingJournal, loadAccountingMapping, publishAccountingMapping } from './reports.api';
import type { AccountingConfiguration, AccountingMapping } from './reports.types';

const labels = { receivables: 'Receivables account', sales: 'Sales account', outputTax: 'Output tax account', rounding: 'Rounding account' } as const;
const mappingFields = Object.keys(labels) as Array<keyof AccountingMapping>;
export function AccountingExportPanel(props: { dateFrom: string; dateTo: string }) {
  const firmId = useFirmId(); const { user } = useAuth();
  return <AccountingExportWorkspace key={`${firmId}:${user?.id}`} {...props} />;
}

function AccountingExportWorkspace({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const notify = useNotification(); const [editing, setEditing] = useState(false);
  const controller = useRef<AbortController>(); const downloadLock = useRef(false);
  const dismissFailure = useRef<(() => void) | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const firmId = useFirmId(); const { user } = useAuth(); const cache = useQueryClient(); const canManage = useHasPermission(PERMISSIONS.ACCOUNTING_MANAGE);
  const key = ['accounting-mapping', firmId, user?.id];
  const current = useQuery({ queryKey: key, queryFn: ({ signal }) => loadAccountingMapping(signal), enabled: firmId != null, retry: false });
  const failed = (error: unknown) => { const failure = toApiError(error); if (!failure.cancelled) { dismissFailure.current?.(); dismissFailure.current = notify(failure.message, 'error'); } };
  const download = useMutation({ mutationFn: async (input: { dateFrom: string; dateTo: string; mappingVersion: number }) => {
    const request = new AbortController(); controller.current = request;
    const blob = await downloadAccountingJournal(input.dateFrom, input.dateTo, input.mappingVersion, request.signal);
    if (request.signal.aborted) return;
    downloadBlob(blob, `billing-journal-${input.dateFrom}-${input.dateTo}.csv`);
    dismissFailure.current?.(); dismissFailure.current = null;
    notify('Billing journal download started.');
  }, onError: failed, onSettled: () => { downloadLock.current = false; } });
  return <DetailSection title="Billing journal export" description="Exports the original invoice, credit-note and debit-note entries and any cancellation entries in the selected UTC date range. Each event balances in its original currency. This export excludes receipts, purchasing, expenses and stock journals. Your accountant must approve the account mapping before using it.">
    <Stack spacing={2}>
      {current.isPending ? <Typography role="status">Loading account mapping…</Typography> : current.isError ? <ErrorState message={toApiError(current.error).message} onRetry={() => void current.refetch()} /> : current.data.mapping ? <><Typography>Published mapping version {current.data.mapping.version}</Typography><DetailFields fields={mappingFields.map((field) => ({ label: labels[field], value: current.data.mapping!.mapping[field] }))} /></> : <Alert severity="info">An explicit account mapping is required before export.</Alert>}
      <DetailActions label="Billing journal actions">
        {canManage ? <AppButton variant="outlined" disabled={!current.isSuccess || download.isPending || editing} onClick={() => setEditing(true)}>{current.data?.mapping ? 'Edit account mapping' : 'Configure account mapping'}</AppButton> : null}
        <AppButton disabled={!current.isSuccess || !current.data.mapping || current.isFetching || download.isPending || editing} onClick={() => {
          if (downloadLock.current || !current.data?.mapping) return;
          downloadLock.current = true;
          download.mutate({ dateFrom, dateTo, mappingVersion: current.data.mapping.version });
        }}>Export billing journal CSV</AppButton>
      </DetailActions>
      {download.isError && !toApiError(download.error).cancelled ? <ErrorState message={toApiError(download.error).message} /> : null}
      {download.isSuccess ? <Alert severity="success">Journal exported with source-event identifiers and mapping version. Deduplicate source-event identifiers when importing into accounting software.</Alert> : null}
      {editing && current.data ? <AccountingMappingEditor initial={current.data} onClosed={() => setEditing(false)} onSaved={(configuration) => cache.setQueryData(key, configuration)} /> : null}
    </Stack>
  </DetailSection>;
}

function AccountingMappingEditor({ initial, onClosed, onSaved }: { initial: AccountingConfiguration; onClosed: () => void; onSaved: (configuration: AccountingConfiguration) => void }) {
  const [mapping, setMapping] = useState<AccountingMapping>(() => initial.mapping?.mapping ?? { receivables: '', sales: '', outputTax: '', rounding: '' });
  const expectedVersion = initial.mapping?.version ?? 0;
  return <CommandForm dialog initialOpen hideTrigger maxWidth="md" title="Account mapping" label="Publish new mapping version" onClosed={onClosed} successMessage="Account mapping published." saved={() => undefined} isSubmitDisabled={mappingFields.some((field) => !mapping[field].trim())} confirmation={{ title: 'Publish account mapping?', label: 'Publish mapping', description: `Publish these account codes as version ${expectedVersion + 1} for future billing journal exports. ${mappingFields.map((field) => `${labels[field]}: ${mapping[field].trim()}`).join('; ')}. Verify them with your accountant before continuing.` }} submit={async (data) => {
    const submitted = Object.fromEntries(mappingFields.map((field) => [field, String(data.get(field) ?? '').trim()])) as AccountingMapping;
    const result = await publishAccountingMapping(expectedVersion, submitted);
    onSaved(result);
  }}>
    <Alert severity="info">Publishing creates a new version. Earlier versions and their exports remain unchanged.</Alert>
    {mappingFields.map((field) => <TextField key={field} name={field} label={labels[field]} value={mapping[field]} required inputProps={{ maxLength: 100 }} onChange={(event) => setMapping({ ...mapping, [field]: event.target.value })} />)}
  </CommandForm>;
}
