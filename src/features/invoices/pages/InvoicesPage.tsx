import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { PERMISSIONS, useAuth, useHasPermission } from '@features/auth';
import { readAssistantDraft } from '@shared/routing/assistantDraft';
import { toApiError } from '@shared/api/apiClient';
import { AppButton } from '@shared/ui/actions';
import { PageContainer, PageHeader } from '@shared/ui/layout';
import { ErrorState } from '@shared/components/common/ErrorState';
import { FullPageLoader } from '@shared/components/common/FullPageLoader';
import { listBillingDocuments, getBillingDocument, getBillingSettings, createBillingDraft, updateBillingDraft } from '../api/invoices.api';
import { invoicesQueryKeys, useBillingFirmId } from '../model/invoices.query-keys';
import type { BillingScope, InvoiceDraft } from '../model/invoices.types';
import { InvoiceDraftForm } from '../components/InvoiceDraftForm';

export const billingTitles = { invoices: 'Invoices', proformas: 'Proformas', 'billing-adjustments': 'Credit & Debit Notes' };
export function InvoicesPage({ scope = 'invoices' }: { scope?: BillingScope }) {
  const firmId = useBillingFirmId(); const navigate = useNavigate();
  const canCreateInvoice = useHasPermission(PERMISSIONS.INVOICES_CREATE); const canManageProforma = useHasPermission(PERMISSIONS.PROFORMAS_MANAGE);
  const [search, setSearch] = useState(''); const [status, setStatus] = useState(''); const [page, setPage] = useState(1); const [sortBy, setSortBy] = useState('createdAt');
  const params = { page, limit: 20, sortBy, ...(search ? { search } : {}), ...(status ? { status } : {}) };
  const query = useQuery({ queryKey: invoicesQueryKeys.list(firmId, scope, params), queryFn: ({ signal }) => listBillingDocuments(scope, params, signal) });
  return <PageContainer><PageHeader title={billingTitles[scope]} description={scope === 'proformas' ? 'Proformas are estimates and never create receivables.' : scope === 'billing-adjustments' ? 'Separate adjustment documents preserve the original invoice.' : 'Create, review and issue invoices.'} actions={scope !== 'billing-adjustments' && (scope === 'invoices' ? canCreateInvoice : canManageProforma) ? <AppButton variant="contained" onClick={() => navigate(`/${scope}/new`)}>Create draft</AppButton> : undefined} />
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField label="Search customer, number or reference" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /><TextField select label="Status" value={status} sx={{ minWidth: 160 }} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><MenuItem value="">All</MenuItem>{['DRAFT', 'ISSUED', 'VOID'].map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}</TextField><TextField select label="Sort by" value={sortBy} sx={{ minWidth: 170 }} onChange={(event) => { setSortBy(event.target.value); setPage(1); }}>{[['createdAt', 'Newest created'], ['invoiceDate', 'Document date'], ['documentNumber', 'Document number'], ['grandTotal', 'Total']].map(([value, title]) => <MenuItem key={value} value={value}>{title}</MenuItem>)}</TextField></Stack>
    {query.isPending ? <FullPageLoader /> : query.isError ? <ErrorState message={toApiError(query.error).message} onRetry={() => { void query.refetch(); }} /> : <><Stack sx={{ overflowX: 'auto' }}><Table aria-label={billingTitles[scope]}><TableHead><TableRow>{['Document', 'Customer', 'Date', 'Status', 'Total', ''].map((label, index) => <TableCell key={index}>{label}</TableCell>)}</TableRow></TableHead><TableBody>{query.data.documents.map((document) => <TableRow key={document.id}><TableCell>{document.documentNumber ?? `Draft #${document.id}`}<br />{document.kind.replace(/_/g, ' ')}</TableCell><TableCell>{document.buyerSnapshot.name}</TableCell><TableCell>{document.invoiceDate}</TableCell><TableCell>{document.status}</TableCell><TableCell>{document.currency} {document.grandTotal}</TableCell><TableCell><AppButton onClick={() => navigate(`/${scope}/${document.id}`)}>Open</AppButton></TableCell></TableRow>)}</TableBody></Table></Stack>{query.data.documents.length === 0 ? <Alert severity="info">No documents match these filters.</Alert> : null}<Stack direction="row" spacing={2}><AppButton disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</AppButton><span>Page {page} · {query.data.pagination.total} documents</span><AppButton disabled={page >= query.data.pagination.totalPages} onClick={() => setPage(page + 1)}>Next</AppButton></Stack></>}
  </PageContainer>;
}
export function InvoiceEditorPage({ scope = 'invoices', editing = false }: { scope?: BillingScope; editing?: boolean }) {
  const firmId = useBillingFirmId(); const { id } = useParams(); const documentId = Number(id); const navigate = useNavigate(); const client = useQueryClient();
  const { state } = useLocation(); const { user } = useAuth();
  const assistantDraft = !editing && scope === 'invoices' ? readAssistantDraft(state, firmId, user?.id, 'INVOICE') : undefined;
  const settings = useQuery({ queryKey: invoicesQueryKeys.settings(firmId), queryFn: ({ signal }) => getBillingSettings(signal) });
  const detail = useQuery({ queryKey: invoicesQueryKeys.detail(firmId, scope, documentId), queryFn: ({ signal }) => getBillingDocument(scope, documentId, signal), enabled: editing && Number.isSafeInteger(documentId) && documentId > 0 });
  const save = useMutation({ mutationFn: ({ input, key }: { input: InvoiceDraft; key: string }) => editing ? updateBillingDraft(scope, documentId, { ...input, expectedVersion: detail.data!.version, refreshCustomFields: false }) : createBillingDraft(scope, { ...input, idempotencyKey: key }), onSuccess: (document) => { void client.invalidateQueries({ queryKey: invoicesQueryKeys.firm(firmId) }); navigate(`/${scope}/${document.id}`); } });
  if (editing && (!Number.isSafeInteger(documentId) || documentId <= 0)) return <ErrorState message="Invalid document ID" />;
  if (settings.isPending || (editing && detail.isPending)) return <FullPageLoader />;
  if (settings.isError || (editing && detail.isError)) return <ErrorState message={toApiError(settings.error ?? detail.error).message} />;
  const document = editing ? detail.data : undefined;
  if (document && (document.status !== 'DRAFT' || document.sourceQuotationId || document.sourceProformaId || document.sourceInvoiceId)) return <Alert severity="info">Financial values on this document are locked. <AppButton onClick={() => navigate(`/${scope}/${document.id}`)}>Open document</AppButton></Alert>;
  return <PageContainer><PageHeader title={`${editing ? 'Edit' : 'Create'} ${scope === 'proformas' ? 'Proforma' : 'Invoice'} Draft`} actions={<AppButton onClick={() => navigate(`/${scope}`)}>Back to list</AppButton>} /><InvoiceDraftForm key={`${firmId}:${user?.id}:${document?.id ?? 'new'}:${document?.version ?? 0}`} scope={scope} settings={settings.data!} document={document} assistantDraft={assistantDraft} pending={save.isPending} error={save.error} onSave={(input, key) => save.mutate({ input, key })} /></PageContainer>;
}
