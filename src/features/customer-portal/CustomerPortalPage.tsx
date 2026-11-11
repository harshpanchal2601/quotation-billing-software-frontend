import { Alert, Checkbox, FormControlLabel, Stack, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { toApiError } from '@shared/api/apiClient';
import { ErrorState } from '@shared/components/common/ErrorState';
import { AppButton } from '@shared/ui/actions';
import { ConfirmDialog } from '@shared/ui/dialogs';
import { formatRecordStatus } from '@shared/ui/display';
import { useNotification } from '@shared/ui/feedback';
import { DetailActions, DetailSection, PageContainer, PageHeader } from '@shared/ui/layout';
import { RecordPagination, RecordTable, type TableSortState } from '@shared/ui/tables';
import { decideSharedQuotation, endPortalSession, getSharedDocument, listSharedDocuments, openPortalSession, type SharedDocument } from './portal.api';
import { PortalDocument } from './PortalDocument';

type Decision = 'ACCEPTED' | 'REJECTED';
type DecisionReview = { document: SharedDocument; decision: Decision; key: string };
export function CustomerPortalPage() {
  const notify = useNotification();
  const [invitation] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('invite') ?? undefined);
  const [session, setSession] = useState<'opening' | 'ready' | 'failed' | 'ended'>('opening');
  const [sessionError, setSessionError] = useState(''); const [sessionRetry, setSessionRetry] = useState(0);
  const [list, setList] = useState<Awaited<ReturnType<typeof listSharedDocuments>> | null>(null);
  const [listError, setListError] = useState(''); const [listRetry, setListRetry] = useState(0);
  const [page, setPage] = useState(1); const [sort, setSort] = useState<TableSortState>({ sortBy: 'id', sortOrder: 'desc' });
  const [document, setDocument] = useState<SharedDocument | null>(null); const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailError, setDetailError] = useState(''); const [pending, setPending] = useState<'document' | 'decision' | 'logout' | null>(null);
  const [consent, setConsent] = useState(false); const [review, setReview] = useState<DecisionReview | null>(null);
  const requestVersion = useRef(0); const writeLock = useRef(false); const decisionAttempt = useRef<DecisionReview | null>(null);
  const documentRegion = useRef<HTMLDivElement>(null);
  useEffect(() => {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    let cancelled = false; setSession('opening'); setSessionError('');
    // An uncertain exchange may have consumed the token. Retry the cookie
    // session; never retain an invitation in a query cache or history URL.
    void openPortalSession(sessionRetry === 0 ? invitation : undefined).then(() => { if (!cancelled) setSession('ready'); }).catch((reason: unknown) => { if (!cancelled) { setSession('failed'); setSessionError(toApiError(reason).message); } });
    return () => { cancelled = true; requestVersion.current += 1; };
  }, [invitation, sessionRetry]);
  useEffect(() => {
    if (session !== 'ready') return;
    let cancelled = false; setList(null); setListError('');
    void listSharedDocuments(page, { sortBy: 'id', sortOrder: sort.sortOrder }).then((value) => { if (!cancelled) setList(value); }).catch((reason: unknown) => { if (!cancelled) { setListError(toApiError(reason).message); setDocument(null); } });
    return () => { cancelled = true; };
  }, [page, session, sort.sortOrder, listRetry]);
  useEffect(() => { if (document) documentRegion.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }); }, [document]);
  function clearSelection() { requestVersion.current += 1; setDocument(null); setSelectedId(null); setDetailError(''); setConsent(false); setReview(null); decisionAttempt.current = null; setPending(null); }
  function changePage(next: number) { if (writeLock.current) return; clearSelection(); setPage(next); }
  async function select(id: number) {
    if (writeLock.current) return;
    const version = ++requestVersion.current; setSelectedId(id); setPending('document'); setDocument(null); setDetailError(''); setConsent(false); setReview(null); decisionAttempt.current = null;
    try { const value = await getSharedDocument(id); if (version === requestVersion.current) setDocument(value); }
    catch (reason) { if (version === requestVersion.current) setDetailError(toApiError(reason).message); }
    finally { if (version === requestVersion.current) setPending(null); }
  }
  function reviewDecision(decision: Decision) {
    if (!document?.canDecide || !consent || pending || writeLock.current) return;
    const previous = decisionAttempt.current;
    setReview(previous && previous.document.id === document.id && previous.document.snapshotHash === document.snapshotHash && previous.decision === decision ? previous : { document, decision, key: crypto.randomUUID() });
  }
  async function decide() {
    if (!review || !consent || writeLock.current) return;
    writeLock.current = true; decisionAttempt.current = review; setPending('decision'); setDetailError('');
    try {
      await decideSharedQuotation(review.document, review.decision, review.key);
      setReview(null); setConsent(false); decisionAttempt.current = null;
      notify(review.decision === 'ACCEPTED' ? 'Quotation approval recorded.' : 'Quotation rejection recorded.');
      try { setDocument(await getSharedDocument(review.document.id)); }
      catch { setDocument(null); setDetailError('Your decision was recorded, but the document could not refresh. Retry the document to review the saved result.'); }
    } catch (reason) { setDetailError(toApiError(reason).message); }
    finally { writeLock.current = false; setPending(null); }
  }
  async function logout() {
    if (writeLock.current) return;
    writeLock.current = true; requestVersion.current += 1; setPending('logout');
    try { await endPortalSession(); setSession('ended'); setList(null); clearSelection(); setSessionError(''); notify('Signed out of the customer portal.', 'info'); }
    catch (reason) { setSessionError(toApiError(reason).message); }
    finally { writeLock.current = false; setPending(null); }
  }
  const sorting = { ...sort, fields: [{ key: 'id', label: 'Shared record number' }], onChange: (value: TableSortState) => { if (writeLock.current) return; clearSelection(); setPage(1); setSort(value); } };
  return <PageContainer maxWidth={1200} sx={{ mx: 'auto', px: { xs: 2, md: 3 }, py: 3 }}><PageHeader title="Customer portal" description={list ? `Welcome, ${list.contactName}` : 'View the documents your supplier has shared with you.'} actions={session === 'ready' ? <AppButton variant="outlined" onClick={() => void logout()} disabled={pending !== null} isLoading={pending === 'logout'}>Sign out</AppButton> : undefined} />
    {sessionError ? <ErrorState message={sessionError} onRetry={session === 'failed' ? () => setSessionRetry((value) => value + 1) : undefined} /> : null}
    {session === 'opening' ? <Typography role="status">Opening secure session…</Typography> : null}
    {session === 'failed' ? <Alert severity="info">If this invitation has expired or been used, ask your supplier for a new invitation.</Alert> : null}
    {session === 'ended' ? <Alert severity="info">Your session has ended. Use a new invitation from your supplier to sign in again.</Alert> : null}
    {session === 'ready' ? <DetailSection title="Shared documents" description="Only documents selected for your contact appear here. Open a record to review its details.">
      {listError ? <ErrorState message={listError} onRetry={() => { clearSelection(); setListRetry((value) => value + 1); }} /> : !list ? <Typography role="status">Loading shared documents…</Typography> : <>
        <RecordTable label="Documents shared with you" rows={list.documents} rowKey={(row) => row.id} rowNumberStart={(page - 1) * 20 + 1} sorting={sorting} emptyMessage="No documents are currently shared with you. Your supplier can share a document when it is ready." columns={[
          { key: 'id', sortKey: 'id', label: 'Shared record', render: (row) => `#${row.id}` },
          { key: 'number', label: 'Document', minWidth: 210, render: (row) => row.number },
          { key: 'kind', label: 'Type', render: (row) => formatRecordStatus(row.kind) },
          { key: 'revision', label: 'Revision', align: 'right', render: (row) => row.revisionNumber ?? '—' },
          { key: 'expires', label: 'Access expires', render: (row) => row.expiresAt ? new Date(row.expiresAt).toLocaleString() : 'Not specified' },
          { key: 'actions', label: 'Actions', render: (row) => <AppButton variant="outlined" disabled={pending !== null} aria-label={`Open ${formatRecordStatus(row.kind).toLowerCase()} ${row.number}${row.revisionNumber !== undefined ? ` revision ${row.revisionNumber}` : ''}`} onClick={() => void select(row.id)}>View document</AppButton> },
        ]} />
        <RecordPagination pagination={{ page, limit: 20, total: list.hasMore ? -1 : (page - 1) * 20 + list.documents.length, hasMore: list.hasMore }} page={page} change={changePage} />
      </>}
    </DetailSection> : null}
    {pending === 'document' ? <Typography role="status">Loading document…</Typography> : null}
    {detailError && !review ? <ErrorState message={detailError} onRetry={selectedId && !pending ? () => void select(selectedId) : undefined} /> : null}
    {document ? <Stack ref={documentRegion} spacing={3} sx={{ scrollMarginTop: 24 }}><DetailActions label="Shared document actions"><AppButton disabled={pending !== null} onClick={clearSelection}>Close document</AppButton></DetailActions><PortalDocument document={document} />
      {document.canDecide ? <DetailSection title="Your quotation decision" description="Review the exact quotation revision before recording your company's decision."><FormControlLabel control={<Checkbox checked={consent} onChange={(_event, checked) => setConsent(checked)} disabled={pending !== null || review !== null} />} label={document.consent} /><DetailActions label="Quotation decision actions"><AppButton variant="contained" disabled={!consent || pending !== null} onClick={() => reviewDecision('ACCEPTED')}>Approve quotation revision</AppButton><AppButton variant="outlined" color="error" disabled={!consent || pending !== null} onClick={() => reviewDecision('REJECTED')}>Reject quotation revision</AppButton></DetailActions></DetailSection> : null}
    </Stack> : null}
    <ConfirmDialog open={review !== null} title={review?.decision === 'ACCEPTED' ? 'Approve this quotation revision?' : 'Reject this quotation revision?'} confirmLabel="Record decision" confirmColor={review?.decision === 'REJECTED' ? 'error' : 'primary'} isConfirming={pending === 'decision'} onClose={() => { if (!writeLock.current) { setReview(null); setDetailError(''); } }} onConfirm={() => void decide()}>
      {review ? <Stack spacing={2}><Typography>{String(review.document.snapshot.quotationNumber ?? 'Quotation')} · Revision {String(review.document.snapshot.revisionNumber ?? '—')}. Your {review.decision === 'ACCEPTED' ? 'approval' : 'rejection'} will be recorded for this exact revision in your contact's name.</Typography>{detailError ? <ErrorState message={detailError} /> : null}</Stack> : null}
    </ConfirmDialog>
  </PageContainer>;
}
