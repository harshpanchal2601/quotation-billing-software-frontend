import { Alert, Checkbox, FormControlLabel, Stack, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { toApiError } from '@shared/api/apiClient';
import { AppButton } from '@shared/ui/actions';
import { PageContainer, PageHeader } from '@shared/ui/layout';
import { decideSharedQuotation, endPortalSession, getSharedDocument, listSharedDocuments, openPortalSession, type SharedDocument } from './portal.api';
import { PortalDocument } from './PortalDocument';

export function CustomerPortalPage() {
  const [invitation] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('invite') ?? undefined);
  const [list, setList] = useState<Awaited<ReturnType<typeof listSharedDocuments>> | null>(null); const [document, setDocument] = useState<SharedDocument | null>(null);
  const [page, setPage] = useState(1); const [error, setError] = useState(''); const [ready, setReady] = useState(false); const [pending, setPending] = useState(false); const [consent, setConsent] = useState(false); const [key, setKey] = useState(() => crypto.randomUUID());
  const requestVersion = useRef(0);
  useEffect(() => {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    let cancelled = false;
    void openPortalSession(invitation).then(() => { if (!cancelled) setReady(true); }).catch((reason: unknown) => { if (!cancelled) setError(toApiError(reason).message); });
    return () => { cancelled = true; requestVersion.current += 1; };
  }, [invitation]);
  useEffect(() => {
    if (!ready) return;
    let cancelled = false; setList(null);
    void listSharedDocuments(page).then((value) => { if (!cancelled) setList(value); }).catch((reason: unknown) => { if (!cancelled) { setError(toApiError(reason).message); setDocument(null); } });
    return () => { cancelled = true; };
  }, [page, ready]);
  async function select(id: number) { const version = ++requestVersion.current; setPending(true); setDocument(null); setError(''); setConsent(false); setKey(crypto.randomUUID()); try { const value = await getSharedDocument(id); if (version === requestVersion.current) setDocument(value); } catch (reason) { if (version === requestVersion.current) setError(toApiError(reason).message); } finally { if (version === requestVersion.current) setPending(false); } }
  async function decide(decision: 'ACCEPTED' | 'REJECTED') { if (!document || !consent) return; setPending(true); setError(''); try { await decideSharedQuotation(document, decision, key); setDocument(await getSharedDocument(document.id)); setConsent(false); } catch (reason) { setError(toApiError(reason).message); } finally { setPending(false); } }
  async function logout() { setPending(true); try { await endPortalSession(); setReady(false); setList(null); setDocument(null); setError('Session ended. Use a new invitation to sign in again.'); } catch (reason) { setError(toApiError(reason).message); } finally { setPending(false); } }
  return <PageContainer><PageHeader title="Customer portal" description={list ? `Welcome ${list.contactName}` : 'View documents explicitly shared with you'} actions={ready ? <AppButton onClick={() => { void logout(); }} disabled={pending}>Sign out</AppButton> : undefined} />
    {error ? <Alert severity="error">{error}</Alert> : null}
    {!ready && !error ? <Typography>Opening secure session…</Typography> : null}
    {ready ? <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">{list?.documents.map((row) => <AppButton key={row.id} disabled={pending} onClick={() => { void select(row.id); }}>{row.kind.replace(/_/g, ' ')} {row.number}{row.revisionNumber !== undefined ? ` · Revision ${row.revisionNumber}` : ''}</AppButton>)}</Stack> : null}
    {list?.documents.length === 0 ? <Typography>No documents are currently shared with you.</Typography> : null}
    {list ? <Stack direction="row"><AppButton disabled={pending || page === 1} onClick={() => setPage(page - 1)}>Previous</AppButton><AppButton disabled={pending || !list.hasMore} onClick={() => setPage(page + 1)}>Next</AppButton></Stack> : null}
    {pending ? <Typography>Processing…</Typography> : null}
    {document ? <><PortalDocument document={document} />{document.canDecide ? <Stack spacing={2}><FormControlLabel control={<Checkbox checked={consent} onChange={(_event, checked) => setConsent(checked)} disabled={pending} />} label={document.consent} /><Stack direction="row" spacing={2}><AppButton variant="contained" disabled={!consent || pending} onClick={() => { void decide('ACCEPTED'); }}>Approve quotation revision</AppButton><AppButton disabled={!consent || pending} onClick={() => { void decide('REJECTED'); }}>Reject quotation revision</AppButton></Stack></Stack> : null}</> : null}
  </PageContainer>;
}
