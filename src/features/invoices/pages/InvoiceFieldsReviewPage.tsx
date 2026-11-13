import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toApiError } from '@shared/api/apiClient';
import { ErrorState } from '@shared/components/common/ErrorState';
import { FullPageLoader } from '@shared/components/common/FullPageLoader';
import { FormActions, FormExitGuard } from '@shared/forms';
import { useSaveAndReturn } from '@shared/routing/returnNavigation';
import { AppButton } from '@shared/ui/actions';
import { ConfirmDialog } from '@shared/ui/dialogs';
import { DetailFields, DetailSection, PageContainer, PageHeader } from '@shared/ui/layout';
import { getBillingDocument, getBillingSettings, updateCustomValues } from '../api/invoices.api';
import { CustomFieldsForm } from '../components/CustomFieldsForm';
import { invoicesQueryKeys, useBillingFirmId } from '../model/invoices.query-keys';
import type { BillingScope, CustomField, CustomValues, InvoiceDocument, SettingsResponse } from '../model/invoices.types';

export function InvoiceFieldsReviewPage({ scope = 'invoices' }: { scope?: BillingScope }) {
  const { id } = useParams(); const firmId = useBillingFirmId(); const documentId = Number(id);
  const valid = Number.isSafeInteger(documentId) && documentId > 0;
  const settings = useQuery({ queryKey: invoicesQueryKeys.settings(firmId), queryFn: ({ signal }) => getBillingSettings(signal), enabled: valid });
  const detail = useQuery({ queryKey: invoicesQueryKeys.detail(firmId, scope, documentId), queryFn: ({ signal }) => getBillingDocument(scope, documentId, signal), enabled: valid });
  if (!valid) return <ErrorState message="Invalid document ID" />;
  if (!settings.data || !detail.data) {
    if (settings.isError || detail.isError) return <ErrorState message={toApiError(settings.error ?? detail.error).message} onRetry={() => { void settings.refetch(); void detail.refetch(); }} />;
    return <FullPageLoader />;
  }
  return <>
    {settings.isError || detail.isError ? <Alert severity="warning">The latest data could not refresh. Your review has been kept.<AppButton onClick={() => { void settings.refetch(); void detail.refetch(); }}>Retry</AppButton></Alert> : null}
    <Review key={`${firmId}:${scope}:${documentId}`} document={detail.data} settings={settings.data} scope={scope} />
  </>;
}

// Compare explicit field properties: database JSON object key order is not a change.
function fieldSignature(fields: CustomField[]) {
  return JSON.stringify(fields.map((field) => [field.key, field.label, field.type, field.required, field.showOnPdf, field.width, field.options]));
}

function Review({ document: currentDocument, settings: currentSettings, scope }: { document: InvoiceDocument; settings: SettingsResponse; scope: BillingScope }) {
  // A background query refresh must not replace the draft the user is reviewing.
  const [{ document, settings, initialValues }] = useState(() => ({ document: currentDocument, settings: currentSettings, initialValues: Object.fromEntries(currentSettings.config.customFields.map((field) => [field.key, currentDocument.customFieldValues[field.key] ?? null])) as CustomValues }));
  const [values, setValues] = useState(initialValues);
  const [confirmRemoval, setConfirmRemoval] = useState(false);
  const saving = useRef(false);
  const client = useQueryClient(); const firmId = useBillingFirmId();
  const { cancel, saved, failed, hasSaved } = useSaveAndReturn(`/${scope}/${document.id}`);
  const dirty = JSON.stringify(values) !== JSON.stringify(initialValues);
  const changed = dirty || fieldSignature(document.customFieldSchema) !== fieldSignature(settings.config.customFields);
  const stale = currentDocument.version !== document.version || currentSettings.version !== settings.version;
  const removed = document.customFieldSchema.filter((field) => !settings.config.customFields.some((current) => current.key === field.key));
  const save = useMutation({
    mutationFn: () => updateCustomValues(scope, document, values, true, settings.version),
    onSuccess: async (updated) => {
      client.setQueryData(invoicesQueryKeys.detail(firmId, scope, document.id), updated);
      await saved('Additional fields applied to the draft.', () => Promise.all([
        client.invalidateQueries({ queryKey: invoicesQueryKeys.firm(firmId) }, { throwOnError: true }),
        client.invalidateQueries({ queryKey: ['invoice-field-history', firmId, scope, document.id] }, { throwOnError: true }),
      ]));
    },
    onError: failed,
    onSettled: () => { saving.current = false; setConfirmRemoval(false); },
  });
  const apply = () => {
    if (saving.current || hasSaved || stale || !changed || document.status !== 'DRAFT') return;
    saving.current = true; save.mutate();
  };
  return <PageContainer><PageHeader title="Review additional fields" description="Review the latest field settings before applying them to this draft." />
    <DetailSection title="Document information"><DetailFields columns={3} fields={[{ label: 'Document', value: document.documentNumber ?? `Draft #${document.id}` }, { label: 'Document version', value: document.version }, { label: 'Field settings version', value: settings.version }]} /></DetailSection>
    {stale && !hasSaved ? <Alert severity="warning">This document or its field settings changed while you were reviewing. Your entries have been kept. Return to the document and open a new review before applying changes.</Alert> : null}
    {document.status !== 'DRAFT' ? <><Alert severity="info">Only drafts can adopt new field settings. This document is unchanged.</Alert><AppButton onClick={cancel}>Back to document</AppButton></> :
      <FormExitGuard dirty={dirty || save.isPending} isSubmitting={save.isPending} hasSaved={hasSaved} onCancel={cancel}>{(requestCancel) => <Stack component="form" spacing={2} onSubmit={(event) => { event.preventDefault(); if (removed.length > 0) setConfirmRemoval(true); else apply(); }}>
        <DetailSection title="Latest additional fields" description="Existing values are kept for matching fields. These changes apply only to this draft.">
          {removed.length > 0 ? <Alert severity="warning">These fields and their saved values will be removed from this draft: {removed.map((field) => field.label).join(', ')}. Earlier versions remain in field history.</Alert> : null}
          {settings.config.customFields.length > 0 ? <CustomFieldsForm fields={settings.config.customFields} values={values} onChange={setValues} disabled={save.isPending || hasSaved} /> : <Alert severity="info">No additional fields are configured.</Alert>}
          {!changed ? <Alert severity="info">This draft already uses these fields and values. No changes are needed.</Alert> : null}
          {save.isError ? <Alert severity="error">{toApiError(save.error).message}</Alert> : null}
        </DetailSection>
        <FormActions cancelLabel="Back to document" submitLabel="Apply to draft" onCancel={requestCancel} isSubmitting={save.isPending} isSubmitDisabled={!changed || stale || hasSaved} />
        <ConfirmDialog open={confirmRemoval} title="Remove older fields from this draft?" confirmLabel="Apply reviewed fields" cancelLabel="Keep reviewing" confirmColor="warning" isConfirming={save.isPending} confirmDisabled={stale || hasSaved} onClose={() => setConfirmRemoval(false)} onConfirm={apply}>The fields listed above and their values will be removed from this draft. Previous versions stay in field history.</ConfirmDialog>
      </Stack>}</FormExitGuard>}
  </PageContainer>;
}
