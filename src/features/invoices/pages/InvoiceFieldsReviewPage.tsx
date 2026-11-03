import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toApiError } from '@shared/api/apiClient';
import { ErrorState } from '@shared/components/common/ErrorState';
import { FullPageLoader } from '@shared/components/common/FullPageLoader';
import { AppButton } from '@shared/ui/actions';
import { PageContainer, PageHeader } from '@shared/ui/layout';
import { getBillingDocument, getBillingSettings, updateCustomValues } from '../api/invoices.api';
import { CustomFieldsForm } from '../components/CustomFieldsForm';
import { invoicesQueryKeys, useBillingFirmId } from '../model/invoices.query-keys';
import type { BillingScope, CustomValues, InvoiceDocument, SettingsResponse } from '../model/invoices.types';

export function InvoiceFieldsReviewPage({ scope = 'invoices' }: { scope?: BillingScope }) {
  const { id } = useParams(); const firmId = useBillingFirmId(); const documentId = Number(id);
  const settings = useQuery({ queryKey: invoicesQueryKeys.settings(firmId), queryFn: ({ signal }) => getBillingSettings(signal) });
  const detail = useQuery({ queryKey: invoicesQueryKeys.detail(firmId, scope, documentId), queryFn: ({ signal }) => getBillingDocument(scope, documentId, signal), enabled: Number.isSafeInteger(documentId) && documentId > 0 });
  if (!Number.isSafeInteger(documentId) || documentId <= 0) return <ErrorState message="Invalid document ID" />;
  if (settings.isPending || detail.isPending) return <FullPageLoader />;
  if (settings.isError || detail.isError) return <ErrorState message={toApiError(settings.error ?? detail.error).message} />;
  return <Review key={`${firmId}:${detail.data.version}:${settings.data.version}`} document={detail.data} settings={settings.data} scope={scope} />;
}
function Review({ document, settings, scope }: { document: InvoiceDocument; settings: SettingsResponse; scope: BillingScope }) {
  const [values, setValues] = useState<CustomValues>(() => Object.fromEntries(settings.config.customFields.map((field) => [field.key, document.customFieldValues[field.key] ?? null])));
  const navigate = useNavigate(); const client = useQueryClient(); const firmId = useBillingFirmId();
  const save = useMutation({ mutationFn: () => updateCustomValues(scope, document, values, true), onSuccess: () => { void client.invalidateQueries({ queryKey: invoicesQueryKeys.firm(firmId) }); navigate(`/${scope}/${document.id}`); } });
  return <PageContainer><PageHeader title="Review Latest Invoice Fields" /><Alert severity="info">Applying the latest configuration replaces this draft's field definitions. Values for removed fields will be dropped from this draft. Issued documents cannot be changed.</Alert>{document.status !== 'DRAFT' ? <Alert severity="warning">Only drafts can adopt a new field configuration.</Alert> : <Stack component="form" spacing={2} onSubmit={(event) => { event.preventDefault(); save.mutate(); }}><CustomFieldsForm fields={settings.config.customFields} values={values} onChange={setValues} />{save.isError ? <Alert severity="error">{toApiError(save.error).message}</Alert> : null}<AppButton type="submit" variant="contained" isLoading={save.isPending}>Apply to draft</AppButton></Stack>}<AppButton onClick={() => navigate(`/${scope}/${document.id}`)}>Back to document</AppButton></PageContainer>;
}
