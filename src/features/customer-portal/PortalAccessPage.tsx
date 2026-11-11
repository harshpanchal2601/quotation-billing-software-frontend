import { Alert, Autocomplete, Checkbox, FormControlLabel, Stack, TextField, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PERMISSIONS, useAuth, useHasPermission } from '@features/auth';
import { toApiError } from '@shared/api/apiClient';
import { EmptyState } from '@shared/components/common/EmptyState';
import { ErrorState } from '@shared/components/common/ErrorState';
import { CommandForm } from '@shared/forms/CommandForm';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { AppButton } from '@shared/ui/actions';
import { AppDialog, ConfirmDialog } from '@shared/ui/dialogs';
import { AppStatusChip, formatRecordStatus } from '@shared/ui/display';
import { useNotification } from '@shared/ui/feedback';
import { DetailActions, DetailFields, DetailSection, PageContainer, PageHeader } from '@shared/ui/layout';
import { RecordPagination, RecordTable, TableSortControls, useTableSort } from '@shared/ui/tables';
import { inviteContact, invitableContacts, listPortalAccess, portalCompanies, portalDocumentOptions, revokePortalAccess, restorePortalIdentity, sharePortalDocument, type PortalCompany, type PortalDocumentKind, type PortalDocumentOption, type PortalIdentity } from './portal.api';

type AccessChange = { kind: 'identity' | 'invitation' | 'grant'; id: number; label: string; restore?: boolean };
type InvitationLink = { url: string; email: string; expiresAt: string };
const portalKeys = (firmId: number | null | undefined, actorId: number | undefined) => ['portal-access', firmId, actorId] as const;
const timestamp = (value: string) => new Date(value).toLocaleString();
const accessStatus = (record: { revokedAt: string | null; expiresAt: string }) => record.revokedAt ? 'Access removed' : new Date(record.expiresAt).getTime() <= Date.now() ? 'Expired' : 'Active';
const documentLabel = (grant: PortalIdentity['grants'][number]) => grant.quotation ? `${grant.quotation.quotationNumber} · Revision ${grant.quotation.revisionNumber}` : grant.invoice?.documentNumber ?? grant.salesOrder?.orderNumber ?? (grant.quotationId ? `Quotation revision #${grant.quotationId}` : grant.invoiceId ? `Invoice #${grant.invoiceId}` : `Sales order #${grant.salesOrderId}`);

export function PortalAccessPage() {
  const firmId = useFirmId(); const { user } = useAuth();
  return <PortalAccess key={`${firmId}:${user?.id}`} />;
}
function PortalAccess() {
  const firmId = useFirmId(); const { user } = useAuth(); const cache = useQueryClient(); const notify = useNotification(); const [params] = useSearchParams();
  const [filterId, setFilterId] = useState(() => { const value = Number(params.get('companyId')); return Number.isSafeInteger(value) && value > 0 ? value : undefined; });
  const [filterCompany, setFilterCompany] = useState<PortalCompany | null>(null); const [page, setPage] = useState(1); const [inviteOpen, setInviteOpen] = useState(false);
  const [shareIdentity, setShareIdentity] = useState<PortalIdentity | null>(null); const [historyIdentity, setHistoryIdentity] = useState<PortalIdentity | null>(null);
  const [link, setLink] = useState<InvitationLink | null>(null); const [change, setChange] = useState<AccessChange | null>(null); const lock = useRef(false); const dismissFailure = useRef<(() => void) | null>(null);
  const keys = portalKeys(firmId, user?.id);
  const sorting = useTableSort([{ key: 'id', label: 'Record number' }, { key: 'name', label: 'Contact name' }, { key: 'email', label: 'Email' }], { paramPrefix: 'portal', onChange: () => setPage(1) });
  const selectedFilter = useQuery({ queryKey: [...keys, 'company', filterId], queryFn: ({ signal }) => portalCompanies('', signal, filterId), enabled: firmId != null && !!filterId && !filterCompany });
  const company = filterCompany ?? selectedFilter.data?.find((entry) => entry.id === filterId) ?? null;
  const query = useQuery({ queryKey: [...keys, 'list', page, filterId, sorting.sortBy, sorting.sortOrder], queryFn: ({ signal }) => listPortalAccess({ page, historyPage: 1, sortBy: sorting.sortBy, sortOrder: sorting.sortOrder, ...(filterId ? { companyId: filterId } : {}) }, signal), enabled: firmId != null });
  const refresh = async () => { await cache.invalidateQueries({ queryKey: keys }, { throwOnError: true }); };
  const access = useMutation({ mutationFn: (entry: AccessChange) => entry.restore ? restorePortalIdentity(entry.id) : revokePortalAccess(entry.kind, entry.id), onSuccess: async (_, entry) => {
    dismissFailure.current?.(); dismissFailure.current = null;
    setChange(null); setHistoryIdentity(null); setLink(null); notify(entry.restore ? 'Contact access reset. Create a new invitation and share the required documents.' : 'Portal access removed.');
    try { await refresh(); } catch { notify('Access was updated, but records could not refresh. Refresh the list before trying again.', 'warning'); }
  }, onError: (error) => { dismissFailure.current?.(); dismissFailure.current = notify(toApiError(error).message, 'error'); }, onSettled: () => { lock.current = false; } });
  const canShare = useHasPermission(PERMISSIONS.QUOTATIONS_VIEW, PERMISSIONS.INVOICES_VIEW, PERMISSIONS.SALES_ORDERS_VIEW);
  const changeDescription = change?.restore ? 'This uses the current company contact name and email. All previous invitation links, sessions and document access are removed. Create a new invitation and share documents again; old access is not restored.' : change?.kind === 'identity' ? 'This removes all invitation links, active portal sessions and shared-document access for this contact. Their recorded quotation decisions and business records remain in history.' : change?.kind === 'invitation' ? 'This invitation link and any portal session created from it will stop working. Other invitations and document history remain available.' : 'This contact will no longer be able to open this shared document. Their other shared documents and recorded quotation decisions remain available.';
  return <PageContainer><PageHeader title="Customer portal access" description="Invite named customer contacts and choose exactly which documents they can view." actions={<AppButton variant="contained" onClick={() => setInviteOpen(true)}>Invite contact</AppButton>} />
    <CompanyChoice value={company} onChange={(value) => { setFilterCompany(value); setFilterId(value?.id); setPage(1); setLink(null); }} label="Filter by company" />
    {selectedFilter.isError ? <ErrorState message={toApiError(selectedFilter.error).message} onRetry={() => void selectedFilter.refetch()} /> : null}
    {link ? <DetailSection title="Invitation link" description={`Deliver this single-use link only to ${link.email}. No email has been sent. It expires ${timestamp(link.expiresAt)}.`}><TextField label="One-time invitation link" value={link.url} InputProps={{ readOnly: true }} autoComplete="off" fullWidth /><DetailActions label="Invitation link actions"><AppButton onClick={() => setLink(null)}>Hide invitation link</AppButton></DetailActions></DetailSection> : null}
    <DetailSection title="Customer contacts" description="Open a contact's history to review invitations, shared documents and customer decisions.">
      {query.isPending ? <Typography role="status">Loading portal contacts…</Typography> : query.isError ? <ErrorState message={toApiError(query.error).message} onRetry={() => void query.refetch()} /> : <><RecordTable label="Customer portal contacts" rows={query.data.identities} rowKey={(identity) => identity.id} sorting={sorting} rowNumberStart={(page - 1) * 20 + 1} emptyMessage="No portal contacts match this company. Use Invite contact to create a named invitation." columns={[
        { key: 'name', label: 'Contact', sortKey: 'name', render: (identity) => identity.name },
        { key: 'email', label: 'Email', sortKey: 'email', minWidth: 240, render: (identity) => identity.email },
        { key: 'company', label: 'Company', render: (identity) => identity.company.name },
        { key: 'status', label: 'Status', render: (identity) => <AppStatusChip label={identity.revokedAt ? 'Access removed' : 'Active'} variant={identity.revokedAt ? 'neutral' : 'success'} /> },
        { key: 'documents', label: 'Documents in history', align: 'right', render: (identity) => identity._count.grants },
        { key: 'actions', label: 'Actions', minWidth: 320, render: (identity) => <DetailActions label={`Actions for ${identity.name}`}><AppButton onClick={() => setHistoryIdentity(identity)}>View history</AppButton>{!identity.revokedAt && canShare ? <AppButton disabled={access.isPending} onClick={() => setShareIdentity(identity)}>Share document</AppButton> : null}<AppButton disabled={access.isPending} onClick={() => { access.reset(); setChange({ kind: 'identity', id: identity.id, label: identity.name, restore: true }); }}>{identity.revokedAt ? 'Restore contact access' : 'Reset contact access'}</AppButton>{!identity.revokedAt ? <AppButton color="error" disabled={access.isPending} onClick={() => { access.reset(); setChange({ kind: 'identity', id: identity.id, label: identity.name }); }}>Remove contact access</AppButton> : null}</DetailActions> },
      ]} /><RecordPagination pagination={{ page, limit: 20, total: query.data.total }} page={page} change={setPage} /></>}
    </DetailSection>
    {inviteOpen ? <InviteContact initialCompany={company} onClose={() => setInviteOpen(false)} onLink={setLink} saved={refresh} /> : null}
    {shareIdentity ? <ShareDocument identity={shareIdentity} onClose={() => setShareIdentity(null)} saved={refresh} /> : null}
    {historyIdentity ? <PortalHistory identity={historyIdentity} onClose={() => { if (!lock.current) setHistoryIdentity(null); }} onChange={(entry) => { access.reset(); setChange(entry); }} busy={access.isPending} /> : null}
    <ConfirmDialog open={!!change} title={change?.restore ? `Reset access for ${change.label}?` : `Remove access: ${change?.label ?? ''}?`} confirmLabel={change?.restore ? 'Reset access' : 'Remove access'} confirmColor={change?.restore ? 'warning' : 'error'} isConfirming={access.isPending} onClose={() => { if (!lock.current) setChange(null); }} onConfirm={() => { if (!change || lock.current) return; lock.current = true; access.mutate(change); }}><Stack spacing={2}><Typography>{changeDescription}</Typography>{access.isError ? <Alert severity="error">{toApiError(access.error).message}</Alert> : null}</Stack></ConfirmDialog>
  </PageContainer>;
}
function CompanyChoice({ value, onChange, label }: { value: PortalCompany | null; onChange: (value: PortalCompany | null) => void; label: string }) {
  const firmId = useFirmId(); const { user } = useAuth(); const [search, setSearch] = useState('');
  const options = useQuery({ queryKey: [...portalKeys(firmId, user?.id), 'companies', search], queryFn: ({ signal }) => portalCompanies(search, signal), enabled: firmId != null });
  const rows = value && !options.data?.some((row) => row.id === value.id) ? [value, ...options.data ?? []] : options.data ?? [];
  return <Stack spacing={1}><Autocomplete options={rows} value={value} loading={options.isFetching} filterOptions={(entries) => entries} isOptionEqualToValue={(left, right) => left.id === right.id} getOptionLabel={(entry) => `${entry.name} (${entry.companyCode})`} onInputChange={(_, text, reason) => { if (reason === 'input' || reason === 'clear') setSearch(text); }} onChange={(_, selected) => onChange(selected)} renderInput={(props) => <TextField {...props} label={label} helperText="Search by company name or code." />} />{options.isError ? <ErrorState message={toApiError(options.error).message} onRetry={() => void options.refetch()} /> : null}</Stack>;
}
function InviteContact({ initialCompany, onClose, onLink, saved }: { initialCompany: PortalCompany | null; onClose: () => void; onLink: (link: InvitationLink) => void; saved: () => Promise<void> }) {
  const firmId = useFirmId(); const { user } = useAuth(); const [company, setCompany] = useState(initialCompany); const [search, setSearch] = useState('');
  const [contact, setContact] = useState<{ id: number; name: string; email: string } | null>(null); const [expiresAt] = useState(() => new Date(Date.now() + 86400000).toISOString());
  const contacts = useQuery({ queryKey: [...portalKeys(firmId, user?.id), 'contacts', company?.id, search], queryFn: ({ signal }) => invitableContacts(company!.id, signal, search), enabled: firmId != null && !!company?.isActive });
  const rows = contact && !contacts.data?.some((row) => row.id === contact.id) ? [contact, ...contacts.data ?? []] : contacts.data ?? [];
  return <CommandForm dialog initialOpen hideTrigger title="Invite customer contact" label="Create invitation" successMessage="Invitation created. Deliver the link only to the named contact." onClosed={onClose} saved={saved} isSubmitDisabled={!company?.isActive || !contact || contacts.isPending || contacts.isError} confirmation={{ title: 'Create this customer invitation?', description: `Create a single-use, 24-hour invitation for ${contact?.name ?? 'the selected contact'} at ${contact?.email ?? 'their saved email'}. The link does not share any document automatically.` }} submit={async () => {
    const result = await inviteContact({ companyId: company!.id, contactId: contact!.id, expiresAt });
    onLink({ url: `${window.location.origin}/customer-portal#invite=${result.token}`, email: result.email, expiresAt });
  }}>
    <input type="hidden" name="invitationSelection" value={JSON.stringify({ companyId: company?.id, contactId: contact?.id, expiresAt })} />
    <CompanyChoice value={company} label="Customer company" onChange={(value) => { setCompany(value); setContact(null); setSearch(''); }} />
    {company && !company.isActive ? <Alert severity="warning">Choose an active company before creating an invitation.</Alert> : null}
    <Autocomplete options={rows} value={contact} loading={contacts.isFetching} disabled={!company?.isActive} filterOptions={(entries) => entries} getOptionLabel={(entry) => `${entry.name} · ${entry.email}`} isOptionEqualToValue={(left, right) => left.id === right.id} onInputChange={(_, value, reason) => { if (reason === 'input' || reason === 'clear') setSearch(value); }} onChange={(_, value) => setContact(value)} renderInput={(props) => <TextField {...props} label="Named company contact" required helperText="Search contact name or email. Only saved contacts with an email can be invited." />} />
    {contacts.isError ? <ErrorState message={toApiError(contacts.error).message} onRetry={() => void contacts.refetch()} /> : company?.isActive && contacts.isSuccess && !contacts.data.length ? <EmptyState title="No matching contacts" description="Add an email to a named contact in the company record, or change your search." /> : null}
    <DetailFields fields={[{ label: 'Invitation expires', value: timestamp(expiresAt) }]} />
  </CommandForm>;
}
function ShareDocument({ identity, onClose, saved }: { identity: PortalIdentity; onClose: () => void; saved: () => Promise<void> }) {
  const firmId = useFirmId(); const { user } = useAuth(); const canQuote = useHasPermission(PERMISSIONS.QUOTATIONS_VIEW); const canInvoice = useHasPermission(PERMISSIONS.INVOICES_VIEW); const canOrder = useHasPermission(PERMISSIONS.SALES_ORDERS_VIEW);
  const kinds = [...canQuote ? [{ value: 'quotationId' as const, label: 'Quotation revision' }] : [], ...canInvoice ? [{ value: 'invoiceId' as const, label: 'Issued invoice' }] : [], ...canOrder ? [{ value: 'salesOrderId' as const, label: 'Sales order' }] : []];
  const [kind, setKind] = useState<PortalDocumentKind>(kinds[0]?.value ?? 'quotationId'); const [document, setDocument] = useState<PortalDocumentOption | null>(null); const [search, setSearch] = useState(''); const [allowDecision, setAllowDecision] = useState(false); const [expiresAt] = useState(() => new Date(Date.now() + 14 * 86400000).toISOString());
  const options = useQuery({ queryKey: [...portalKeys(firmId, user?.id), 'documents', identity.id, kind, search], queryFn: ({ signal }) => portalDocumentOptions(identity.id, kind, search, signal), enabled: firmId != null && kinds.some((entry) => entry.value === kind) });
  const rows = document && !options.data?.some((row) => row.id === document.id) ? [document, ...options.data ?? []] : options.data ?? [];
  const payload = { identityId: identity.id, [kind]: document?.id, allowDecision: kind === 'quotationId' && !!document?.allowDecision && allowDecision, expiresAt };
  return <CommandForm dialog initialOpen hideTrigger title="Share a document" label="Share document" onClosed={onClose} saved={saved} successMessage="Document shared with the selected contact." isSubmitDisabled={!document || options.isPending || options.isError || !kinds.some((entry) => entry.value === kind)} confirmation={{ title: `Share with ${identity.name}?`, description: `${document?.label ?? 'This document'} will be available until ${timestamp(expiresAt)}. ${payload.allowDecision ? 'This contact may approve or reject this exact quotation revision.' : 'This grants viewing access only.'}` }} submit={() => sharePortalDocument(payload)}>
    <input type="hidden" name="documentSelection" value={JSON.stringify(payload)} />
    <DetailFields fields={[{ label: 'Contact', value: identity.name }, { label: 'Email', value: identity.email }, { label: 'Company', value: identity.company.name }]} />
    <TextField name="documentKind" select SelectProps={{ native: true }} InputLabelProps={{ shrink: true }} label="Document type" value={kind} onChange={(event) => { setKind(event.target.value as PortalDocumentKind); setDocument(null); setAllowDecision(false); setSearch(''); }}>{kinds.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}</TextField>
    <Autocomplete options={rows} value={document} loading={options.isFetching} filterOptions={(entries) => entries} getOptionLabel={(entry) => entry.label} isOptionEqualToValue={(left, right) => left.id === right.id} onInputChange={(_, value, reason) => { if (reason === 'input' || reason === 'clear') setSearch(value); }} onChange={(_, value) => { setDocument(value); setAllowDecision(false); }} renderInput={(props) => <TextField {...props} label="Document to share" required helperText="Search the document number. Only this customer's documents are listed; sharing checks their current approval and availability." />} />
    {options.isError ? <ErrorState message={toApiError(options.error).message} onRetry={() => void options.refetch()} /> : options.isSuccess && !options.data.length ? <EmptyState title="No matching documents" description="Change your search or check that the document is ready to share for this customer." /> : null}
    {kind === 'quotationId' ? <FormControlLabel label="Allow this contact to approve or reject this quotation revision" control={<Checkbox name="allowDecision" checked={allowDecision} disabled={!document?.allowDecision} onChange={(_, checked) => setAllowDecision(checked)} />} /> : null}
    <DetailFields fields={[{ label: 'Access expires', value: timestamp(expiresAt) }]} />
  </CommandForm>;
}
function PortalHistory({ identity, onClose, onChange, busy }: { identity: PortalIdentity; onClose: () => void; onChange: (entry: AccessChange) => void; busy: boolean }) {
  const firmId = useFirmId(); const { user } = useAuth(); const compact = useMediaQuery(useTheme().breakpoints.down('sm')); const [page, setPage] = useState(1);
  const sort = useTableSort([{ key: 'id', label: 'Record number' }, { key: 'expiresAt', label: 'Expiry date' }], { paramPrefix: 'portalHistory', onChange: () => setPage(1) });
  const query = useQuery({ queryKey: [...portalKeys(firmId, user?.id), 'history', identity.id, page, sort.sortBy, sort.sortOrder], queryFn: ({ signal }) => listPortalAccess({ page: 1, historyPage: page, identityId: identity.id, historySortBy: sort.sortBy, historySortOrder: sort.sortOrder }, signal), enabled: firmId != null });
  const row = query.data?.identities.find((entry) => entry.id === identity.id);
  const total = row ? Math.max(row._count.invitations, row._count.grants) : 0;
  return <AppDialog open title={`Portal history: ${identity.name}`} onClose={onClose} preventClose={busy} fullWidth maxWidth="lg" fullScreen={compact} actions={<AppButton onClick={onClose} disabled={busy}>Close</AppButton>}>
    {query.isPending ? <Typography role="status">Loading contact history…</Typography> : query.isError ? <ErrorState message={toApiError(query.error).message} onRetry={() => void query.refetch()} /> : !row ? <EmptyState title="Contact unavailable" description="Refresh the portal contact list and try again." /> : <Stack spacing={3}>
      <DetailSection title="Contact details"><DetailFields fields={[{ label: 'Contact', value: row.name }, { label: 'Email', value: row.email }, { label: 'Company', value: row.company.name }, { label: 'Access', value: row.revokedAt ? 'Access removed' : 'Active' }]} /></DetailSection>
      <TableSortControls {...sort} />
      <DetailSection title="Invitations"><RecordTable label="Contact invitation history" rows={row.invitations} rowKey={(entry) => entry.id} sorting={sort} showSortControls={false} rowNumberStart={(page - 1) * 20 + 1} emptyMessage="No invitations on this history page." columns={[
        { key: 'id', label: 'Invitation', sortKey: 'id', render: (entry) => `#${entry.id}` },
        { key: 'expires', label: 'Expires', sortKey: 'expiresAt', render: (entry) => timestamp(entry.expiresAt) },
        { key: 'status', label: 'Status', render: (entry) => entry.revokedAt ? 'Access removed' : entry.consumedAt ? 'Used' : accessStatus(entry) },
        { key: 'actions', label: 'Actions', render: (entry) => !entry.revokedAt ? <AppButton color="error" disabled={busy} onClick={() => onChange({ kind: 'invitation', id: entry.id, label: `invitation #${entry.id} for ${row.name}` })}>Remove invitation access</AppButton> : '—' },
      ]} /></DetailSection>
      <DetailSection title="Shared documents"><RecordTable label="Contact shared document history" rows={row.grants} rowKey={(entry) => entry.id} sorting={sort} showSortControls={false} rowNumberStart={(page - 1) * 20 + 1} emptyMessage="No shared documents on this history page." columns={[
        { key: 'id', label: 'Access record', sortKey: 'id', render: (entry) => `#${entry.id}` },
        { key: 'document', label: 'Document', minWidth: 240, render: documentLabel },
        { key: 'expires', label: 'Expires', sortKey: 'expiresAt', render: (entry) => timestamp(entry.expiresAt) },
        { key: 'status', label: 'Status', render: accessStatus },
        { key: 'decisions', label: 'Quotation decisions', render: (entry) => entry.allowDecision ? 'Allowed' : 'Viewing only' },
        { key: 'actions', label: 'Actions', render: (entry) => !entry.revokedAt ? <AppButton color="error" disabled={busy} onClick={() => onChange({ kind: 'grant', id: entry.id, label: documentLabel(entry) })}>Remove document access</AppButton> : '—' },
      ]} /></DetailSection>
      <Typography variant="caption" color="text.secondary">Invitations and shared documents use the same history page and server sort. Customer decision records are shown for documents on this page.</Typography>
      <RecordPagination pagination={{ page, limit: 20, total }} page={page} change={setPage} />
      <DetailSection title="Customer decisions"><RecordTable label="Recorded customer quotation decisions" rows={row.grants.flatMap((grant) => grant.acceptances.map((entry) => ({ ...entry, document: documentLabel(grant) })))} rowKey={(entry) => entry.id} emptyMessage="No customer decisions for documents on this history page." columns={[
        { key: 'document', label: 'Quotation', minWidth: 240, render: (entry) => entry.document },
        { key: 'decision', label: 'Decision', render: (entry) => formatRecordStatus(entry.decision) },
        { key: 'actor', label: 'Recorded by', render: (entry) => entry.actorName },
        { key: 'revision', label: 'Revision', align: 'right', render: (entry) => entry.revisionNumber },
        { key: 'date', label: 'Recorded at', render: (entry) => timestamp(entry.createdAt) },
      ]} /></DetailSection>
    </Stack>}
  </AppDialog>;
}
