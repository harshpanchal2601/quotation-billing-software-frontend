import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PERMISSIONS, useAuth, useHasPermission } from '@features/auth';
import { readAssistantDraft } from '@shared/routing/assistantDraft';
import { getCurrentListReturnState, useSaveAndReturn } from '@shared/routing/returnNavigation';
import { RecordPagination, RecordTable, useTableSort } from '@shared/ui/tables';
import { toApiError } from '@shared/api/apiClient';
import { AppButton } from '@shared/ui/actions';
import { AppStatusChip, formatRecordStatus } from '@shared/ui/display';
import { DetailFields, DetailSection, PageContainer, PageHeader } from '@shared/ui/layout';
import { ErrorState } from '@shared/components/common/ErrorState';
import { FullPageLoader } from '@shared/components/common/FullPageLoader';
import { listBillingDocuments, getBillingDocument, getBillingSettings, createBillingDraft, updateBillingDraft } from '../api/invoices.api';
import { invoicesQueryKeys, useBillingFirmId } from '../model/invoices.query-keys';
import type { BillingScope, InvoiceDraft } from '../model/invoices.types';
import { InvoiceDraftForm } from '../components/InvoiceDraftForm';

const billingTitles = { invoices: 'Invoices', proformas: 'Proforma invoices', 'billing-adjustments': 'Credit & Debit Notes' };
export function InvoicesPage({ scope = 'invoices' }: { scope?: BillingScope }) {
  const firmId = useBillingFirmId(); const navigate = useNavigate(); const location = useLocation(); const [searchParams, setSearchParams] = useSearchParams();
  const canCreateInvoice = useHasPermission(PERMISSIONS.INVOICES_CREATE); const canManageProforma = useHasPermission(PERMISSIONS.PROFORMAS_MANAGE);
  const search = searchParams.get('search') ?? ''; const requestedPage = Number(searchParams.get('page'));
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 && requestedPage <= 100000 ? requestedPage : 1;
  const status = ['DRAFT', 'ISSUED', 'VOID'].includes(searchParams.get('status') ?? '') ? searchParams.get('status')! : '';
  const sorting = useTableSort([{ key: 'createdAt', label: 'Created date' }, { key: 'invoiceDate', label: 'Document date' }, { key: 'documentNumber', label: 'Document number' }, { key: 'grandTotal', label: 'Total' }]);
  const change = (patch: Record<string, string | number>) => setSearchParams((current) => { const next = new URLSearchParams(current); for (const [name, value] of Object.entries(patch)) { if (String(value)) next.set(name, String(value)); else next.delete(name); } return next; }, { replace: true });
  const returnState = getCurrentListReturnState(location.pathname, location.search);
  const params = { page, limit: 20, sortBy: sorting.sortBy, sortOrder: sorting.sortOrder, ...(search ? { search } : {}), ...(status ? { status } : {}) };
  const query = useQuery({ queryKey: invoicesQueryKeys.list(firmId, scope, params), queryFn: ({ signal }) => listBillingDocuments(scope, params, signal) });
  return <PageContainer><PageHeader title={billingTitles[scope]} description={scope === 'proformas' ? 'Proformas are estimates and never create receivables.' : scope === 'billing-adjustments' ? 'Separate adjustment documents preserve the original invoice.' : 'Create, review and issue invoices.'} actions={scope !== 'billing-adjustments' && (scope === 'invoices' ? canCreateInvoice : canManageProforma) ? <AppButton variant="contained" onClick={() => navigate(`/${scope}/new`, { state: returnState })}>Create draft</AppButton> : undefined} />
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField name="search" label="Search customer, number or reference" value={search} onChange={(event) => { change({ search: event.target.value, page: 1 }); }} /><TextField name="status" select label="Status" value={status} sx={{ minWidth: 160 }} onChange={(event) => { change({ status: event.target.value, page: 1 }); }}><MenuItem value="">All</MenuItem>{['DRAFT', 'ISSUED', 'VOID'].map((value) => <MenuItem key={value} value={value}>{formatRecordStatus(value)}</MenuItem>)}</TextField></Stack>
    {query.isPending ? <FullPageLoader /> : query.isError ? <ErrorState message={toApiError(query.error).message} onRetry={() => { void query.refetch(); }} /> : <><RecordTable rows={query.data.documents} sorting={sorting} rowNumberStart={(page - 1) * 20 + 1} label={billingTitles[scope]} rowKey={(document) => document.id} emptyMessage="No documents match these filters." columns={[
      { key: 'document', sortKey: 'documentNumber', label: 'Document', render: (document) => <Stack><span>{document.documentNumber ?? `Draft #${document.id}`}</span><span>{document.kind.replace(/_/g, ' ').toLowerCase()}</span></Stack> }, { key: 'customer', label: 'Customer', render: (document) => document.buyerSnapshot.name },
      { key: 'date', sortKey: 'invoiceDate', label: 'Date', render: (document) => document.invoiceDate }, { key: 'status', label: 'Status', render: (document) => <AppStatusChip label={formatRecordStatus(document.status)} variant={document.status === 'ISSUED' ? 'success' : document.status === 'VOID' ? 'error' : 'neutral'} /> }, { key: 'total', sortKey: 'grandTotal', label: 'Total', align: 'right', render: (document) => `${document.currency} ${document.grandTotal}` },
      { key: 'actions', label: 'Actions', render: (document) => <AppButton onClick={() => navigate(`/${scope}/${document.id}`, { state: returnState })}>Open {document.documentNumber ?? `draft #${document.id}`}</AppButton> },
    ]} /><RecordPagination pagination={query.data.pagination} page={page} change={(value) => change({ page: value })} /></>}

  </PageContainer>;
}
export function InvoiceEditorPage({ scope = 'invoices', editing = false }: { scope?: BillingScope; editing?: boolean }) {
  const firmId = useBillingFirmId(); const { user } = useAuth(); const [session, setSession] = useState(0);
  return <InvoiceEditorSession key={`${firmId}:${user?.id}:${scope}:${editing}:${session}`} scope={scope} editing={editing} fresh={session > 0} onRestart={() => setSession((current) => current + 1)} />;
}
function InvoiceEditorSession({ scope, editing, fresh, onRestart }: { scope: BillingScope; editing: boolean; fresh: boolean; onRestart: () => void }) {
  const firmId = useBillingFirmId(); const { id } = useParams(); const documentId = Number(id); const navigate = useNavigate(); const client = useQueryClient();
  const { state } = useLocation(); const { user } = useAuth();
  const canView = useHasPermission(scope === 'proformas' ? PERMISSIONS.PROFORMAS_VIEW : PERMISSIONS.INVOICES_VIEW);
  const canCreate = useHasPermission(scope === 'proformas' ? PERMISSIONS.PROFORMAS_MANAGE : PERMISSIONS.INVOICES_CREATE);
  const { cancel, saved, failed, hasSaved } = useSaveAndReturn(`/${scope}`, { navigateAfterSave: canView });
  const assistantDraft = !fresh && !editing && scope === 'invoices' ? readAssistantDraft(state, firmId, user?.id, 'INVOICE') : undefined;
  const settings = useQuery({ queryKey: invoicesQueryKeys.settings(firmId), queryFn: ({ signal }) => getBillingSettings(signal) });
  const detail = useQuery({ queryKey: invoicesQueryKeys.detail(firmId, scope, documentId), queryFn: ({ signal }) => getBillingDocument(scope, documentId, signal), enabled: editing && Number.isSafeInteger(documentId) && documentId > 0 });
  const save = useMutation({ mutationFn: ({ input, key }: { input: InvoiceDraft; key: string }) => editing ? updateBillingDraft(scope, documentId, { ...input, expectedVersion: detail.data!.version, refreshCustomFields: false }) : createBillingDraft(scope, { ...input, idempotencyKey: key }), onSuccess: (document) => saved(`${document.kind === 'PROFORMA' ? 'Proforma' : 'Invoice'} draft saved.`, () => client.invalidateQueries({ queryKey: invoicesQueryKeys.firm(firmId) })), onError: failed });
  if (!canView && hasSaved && save.data) return <PageContainer><PageHeader title={`${scope === 'proformas' ? 'Proforma' : 'Invoice'} draft saved`} description="Your draft is saved. An authorized colleague can review and issue it." /><DetailSection title="Saved draft"><Stack spacing={2}><DetailFields fields={[{ label: 'Reference', value: save.data.documentNumber ?? `Draft #${save.data.id}` }, { label: 'Customer', value: save.data.buyerSnapshot.name }, { label: 'Status', value: formatRecordStatus(save.data.status) }, { label: 'Total', value: `${save.data.currency} ${save.data.grandTotal}` }]} />{canCreate ? <AppButton variant="contained" disabled={save.isPending} onClick={() => { navigate(`/${scope}/new`, { replace: true, state: null }); onRestart(); }}>Create another draft</AppButton> : null}</Stack></DetailSection></PageContainer>;
  if (editing && (!Number.isSafeInteger(documentId) || documentId <= 0)) return <ErrorState message="Invalid document ID" />;
  if (settings.isPending || (editing && detail.isPending)) return <FullPageLoader />;
  if (settings.isError || (editing && detail.isError)) return <ErrorState message={toApiError(settings.error ?? detail.error).message} />;
  const document = editing ? detail.data : undefined;
  if (document && (document.status !== 'DRAFT' || document.sourceQuotationId || document.sourceProformaId || document.sourceInvoiceId || document.sourceSalesOrderId)) return <Alert severity="info">Financial values on this document are locked. <AppButton onClick={() => navigate(`/${scope}/${document.id}`)}>Open document</AppButton></Alert>;
  return <PageContainer><PageHeader title={`${editing ? 'Edit' : 'Create'} ${scope === 'proformas' ? 'Proforma' : 'Invoice'} Draft`} actions={canView ? <AppButton onClick={cancel}>Back to list</AppButton> : undefined} /><InvoiceDraftForm hasSaved={hasSaved} onCancel={canView ? cancel : onRestart} key={`${firmId}:${user?.id}:${document?.id ?? 'new'}:${document?.version ?? 0}`} scope={scope} settings={settings.data!} document={document} assistantDraft={assistantDraft} pending={save.isPending} error={save.error} onSave={(input, key) => save.mutate({ input, key })} /></PageContainer>;
}
