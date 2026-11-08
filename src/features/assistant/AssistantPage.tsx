import Alert from '@mui/material/Alert';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PERMISSIONS, useAuth, useHasPermission } from '@features/auth';
import { toApiError } from '@shared/api/apiClient';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { AppButton } from '@shared/ui/actions';
import { PageContainer, PageHeader } from '@shared/ui/layout';
import { assistantApi, type Draft, type Extraction, type Proposal, type Reply } from './assistant.api';
import { ProposalReview } from './ProposalReview';

export function AssistantPage() {
  const firmId = useFirmId(); const { user } = useAuth();
  return <AssistantSession key={`${firmId}:${user?.id}`} />;
}
function AssistantSession() {
  const firmId = useFirmId(); const { user } = useAuth(); const cache = useQueryClient(); const navigate = useNavigate();
  const [message, setMessage] = useState(''); const [mode, setMode] = useState<'AUTO' | 'LOCAL' | 'LLM'>('AUTO');
  const [replies, setReplies] = useState<Reply[]>([]); const [conversationId, setConversationId] = useState<string>();
  const [request, setRequest] = useState<Parameters<typeof assistantApi.chat>[0] | null>(null);
  const [companyId, setCompanyId] = useState<number>(); const [itemIds, setItemIds] = useState<number[]>([]);
  const [proposal, setProposal] = useState<Proposal | null>(null); const [historyPage, setHistoryPage] = useState(1);
  const canInvoice = useHasPermission(PERMISSIONS.INVOICES_ISSUE); const canQuoteStatus = useHasPermission(PERMISSIONS.QUOTATIONS_STATUS);
  const canOrder = useHasPermission(PERMISSIONS.SALES_ORDERS_MANAGE);
  const status = useQuery({ queryKey: ['assistant-status', firmId, user?.id], queryFn: assistantApi.status, refetchInterval: 30000 });
  const history = useQuery({ queryKey: ['assistant-history', firmId, user?.id, historyPage], queryFn: () => assistantApi.history(historyPage) });
  const chat = useMutation({ mutationFn: assistantApi.chat, onSuccess: async (reply) => { setReplies((current) => [...current, reply]); setConversationId(reply.conversationId); setMessage(''); setRequest(null); await cache.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).startsWith('assistant') }); } });
  const propose = useMutation({ mutationFn: (command: Record<string, unknown>) => assistantApi.propose({ conversationId: conversationId!, mode: replies[replies.length - 1]?.mode ?? 'LOCAL', command }), onSuccess: setProposal });
  const erase = useMutation({ mutationFn: assistantApi.erase, onSuccess: async (_, id) => { if (conversationId === id) { setReplies([]); setConversationId(undefined); setRequest(null); } await cache.invalidateQueries({ queryKey: ['assistant-history', firmId, user?.id] }); } });
  function send(text: string, plan?: unknown) { const input = { requestId: crypto.randomUUID(), conversationId, message: text, mode, ...(plan ? { plan } : {}) }; setRequest(input); chat.mutate(input); }
  function submit(event: FormEvent) { event.preventDefault(); if (message.trim() && !chat.isPending) send(message); }
  function openDraft(draft: Draft) {
    if (draft.kind === 'INVOICE' || draft.kind === 'QUOTATION') navigate(draft.href, { state: { source: 'assistant', firmId, actorId: user!.id, kind: draft.kind, companyId: draft.companyId, lines: draft.lines } });
    else navigate(draft.href);
  }
  return <PageContainer><PageHeader title="Business assistant" description="Search firm records, review reports and prepare drafts. Every consequential action requires your confirmation." actions={user?.accountType === 'FIRM_ADMIN' ? <AppButton component={Link} to="/settings/assistant">Assistant settings</AppButton> : undefined} />
    <Stack spacing={3}>
      {status.isError ? <Alert severity="error">{toApiError(status.error).message}</Alert> : null}
      {status.data ? <Paper variant="outlined" sx={{ p: 2 }}><Typography>Active mode: {status.data.mode ?? 'Unavailable'} · LLM allowance used: {status.data.credits.used} / {status.data.credits.limit ?? 'unlimited'} · LLM attempts today: {status.data.todayRequests}</Typography>{status.data.notice ? <Alert severity="info">{status.data.notice}</Alert> : null}<Typography variant="body2">Your connection: {status.data.connection.replace(/_/g, ' ').toLowerCase()}. Conversation content storage: {status.data.settings.retainContentDays ? `${status.data.settings.retainContentDays} days` : 'off'}.</Typography></Paper> : null}
      <Stack component="form" onSubmit={submit} spacing={2}>
        <TextField select label="Assistant mode" value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}><MenuItem value="AUTO">Automatic, with local fallback</MenuItem><MenuItem value="LOCAL" disabled={!status.data?.localAllowed}>Local</MenuItem><MenuItem value="LLM" disabled={!status.data?.llmAllowed}>Connected ChatGPT</MenuItem></TextField>
        <TextField multiline minRows={2} label="Ask about your firm" placeholder="Find quotations for ABC, outstanding invoices, or sales report" value={message} onChange={(event) => setMessage(event.target.value)} inputProps={{ maxLength: 4000 }} />
        <Stack direction="row" spacing={1}><AppButton type="submit" variant="contained" disabled={!message.trim() || !status.data?.mode} isLoading={chat.isPending}>Ask assistant</AppButton><AppButton disabled={chat.isPending || propose.isPending} onClick={() => { setReplies([]); setConversationId(undefined); setRequest(null); setCompanyId(undefined); setItemIds([]); chat.reset(); }}>New conversation</AppButton></Stack>
      </Stack>
      {chat.isPending ? <Typography role="status">Checking access and reading authorized records…</Typography> : null}
      {chat.isError ? <Alert severity="error">{toApiError(chat.error).message}{request ? <AppButton onClick={() => chat.mutate(request)}>Check original request</AppButton> : null}</Alert> : null}
      {propose.isError ? <Alert severity="error">{toApiError(propose.error).message}</Alert> : null}
      {replies.map((reply) => <Paper variant="outlined" sx={{ p: 2 }} key={reply.requestId}><Stack spacing={1}>
        <Typography variant="subtitle2">{reply.mode === 'LOCAL' ? 'Local assistant' : 'Connected assistant'} · {reply.toolStatus.toLowerCase()}</Typography>
        {reply.notice ? <Alert severity="info">{reply.notice}</Alert> : null}
        {reply.result.message ? <Typography>{reply.result.message}</Typography> : null}
        {reply.result.records ? <>
          {reply.result.records.length === 0 ? <Typography>No matching authorized records.</Typography> : null}
          {reply.result.records.length > 1 ? <Typography>Select the exact customer or item below before drafting. Record actions always apply to the displayed ID.</Typography> : null}
          {reply.result.records.map((record) => <Stack key={record.id} direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems="center">
            <Link to={record.href}>{record.label} · #{record.id}</Link><Typography>{record.customer} {record.status} {record.currency} {record.total}</Typography>
            {reply.plan.resource === 'CUSTOMERS' ? <AppButton onClick={() => setCompanyId(record.id)}>{companyId === record.id ? 'Customer selected' : 'Select customer'}</AppButton> : null}
            {reply.plan.resource === 'ITEMS' ? <FormControlLabel label="Include item in draft" control={<Checkbox checked={itemIds.includes(record.id)} onChange={(_, checked) => setItemIds((current) => checked ? [...current, record.id].slice(0, 25) : current.filter((id) => id !== record.id))} />} /> : null}
            {reply.plan.resource === 'INVOICES' && record.status === 'DRAFT' && canInvoice ? <AppButton disabled={propose.isPending} onClick={() => propose.mutate({ action: 'INVOICE_ISSUE', entityId: record.id, expectedVersion: record.version, confirmedTotal: record.total })}>Review issuance</AppButton> : null}
            {reply.plan.resource === 'QUOTATIONS' && ['DRAFT', 'PENDING'].includes(record.status ?? '') && canQuoteStatus ? <AppButton disabled={propose.isPending} onClick={() => propose.mutate({ action: 'QUOTATION_SEND', entityId: record.id, status: 'SENT' })}>Review mark as sent</AppButton> : null}
            {reply.plan.resource === 'QUOTATIONS' && record.status === 'ACCEPTED' && canOrder ? <AppButton disabled={propose.isPending} onClick={() => propose.mutate({ action: 'ORDER_CONFIRM', entityId: record.id, idempotencyKey: crypto.randomUUID() })}>Review order creation</AppButton> : null}
          </Stack>)}
          {reply.result.pagination && reply.result.pagination.page * 20 < reply.result.pagination.total ? <AppButton disabled={chat.isPending} onClick={() => send('Continue this search', { ...reply.plan, page: reply.result.pagination!.page + 1 })}>More matching records</AppButton> : null}
        </> : null}
        {reply.result.currencies ? <><Typography>Issued-document sales, {reply.result.dateFrom ?? 'all dates'} to {reply.result.dateTo ?? 'today'}. Credits reduce sales; receipts are separate.</Typography>{reply.result.currencies.length === 0 ? <Typography>No issued sales match.</Typography> : null}{reply.result.currencies.map((row) => <Typography key={row.currency}>{row.currency} {row.netSales} · {row.documents} documents</Typography>)}<Link to="/invoices">View billing documents</Link></> : null}
        {reply.result.buckets?.map((row) => <Typography key={`${row.currency}:${row.bucket}`}>{row.currency} {row.amount} · {row.bucket.replace(/_/g, ' ')} · {row.count} invoices</Typography>)}
        {reply.result.receivables?.map((row) => <Typography key={row.id}><Link to={row.href}>{row.documentNumber}</Link> · {row.companyName} · outstanding {row.currency} {row.outstanding}</Typography>)}
        {reply.result.receivables?.length === 0 ? <Typography>No outstanding invoices match.</Typography> : null}
        {reply.result.customerCredits?.map((row) => <Typography key={row.currency}>Unapplied customer credit: {row.currency} {row.unapplied}</Typography>)}
        {reply.result.kind ? <><Typography>Unsaved {reply.result.kind.toLowerCase().replace(/_/g, ' ')} for {reply.result.customer}</Typography>{reply.result.subject ? <Typography>{reply.result.subject}</Typography> : null}<Typography sx={{ whiteSpace: 'pre-wrap' }}>{reply.result.text}</Typography>{reply.result.lines?.map((line, index) => <Typography key={index}>{line.itemName} · {line.quantity} {line.measurementUnit} · rate {line.unitRate}</Typography>)}<DraftActions draft={reply.result as Draft} onOpen={openDraft} /></> : null}
      </Stack></Paper>)}
      <Typography variant="h6">Prepare a draft</Typography>
      <Typography>Search and select one customer and up to 25 items. Selected customer: {companyId ? `#${companyId}` : 'none'} · selected items: {itemIds.length}.</Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>{(['QUOTATION', 'INVOICE', 'FOLLOW_UP', 'EMAIL'] as const).map((kind) => <AppButton key={kind} disabled={!companyId || chat.isPending} onClick={() => send(`Prepare ${kind.toLowerCase()} draft`, { tool: 'DRAFT', kind, companyId, itemIds })}>{kind.toLowerCase().replace(/_/g, ' ')}</AppButton>)}</Stack>
      <DocumentReview companyId={companyId} onReview={openDraft} />
      <Typography variant="h6">Your action and request history</Typography>
      <Typography variant="body2">Conversation history is private to your Bhuminex user. Required action audit and usage metadata remain after content deletion.</Typography>
      {history.isError || erase.isError ? <Alert severity="error">{toApiError(history.error ?? erase.error).message}</Alert> : null}
      {history.data?.conversations.map((conversation) => <Paper variant="outlined" sx={{ p: 2 }} key={conversation.id}><Typography>{new Date(conversation.createdAt).toLocaleString()}</Typography>{conversation.messages.map((entry) => <Typography key={entry.id}>{entry.mode} · {entry.tool ?? 'Request'} · {entry.status}{entry.errorCode ? ` · ${entry.errorCode.replace(/_/g, ' ')}` : ''}</Typography>)}{conversation.proposals.map((entry) => <Typography key={entry.id}>{entry.command.action.replace(/_/g, ' ')} · {entry.status}{entry.execution ? <> · <Link to={entry.execution.result.href}>Open executed result</Link></> : null}</Typography>)}<AppButton disabled={erase.isPending} onClick={() => erase.mutate(conversation.id)}>Erase content and close conversation</AppButton></Paper>)}
      <Stack direction="row" spacing={1}><AppButton disabled={historyPage === 1} onClick={() => setHistoryPage((page) => page - 1)}>Previous history</AppButton><AppButton disabled={!history.data?.hasMore} onClick={() => setHistoryPage((page) => page + 1)}>More history</AppButton></Stack>
    </Stack>
    {proposal ? <ProposalReview key={proposal.id} proposal={proposal} onClose={() => setProposal(null)} onExecuted={() => { void cache.invalidateQueries({ predicate: (query) => query.queryKey[0] !== 'auth' }); }} /> : null}
  </PageContainer>;
}
function DraftActions({ draft, onOpen }: { draft: Draft; onOpen: (draft: Draft) => void }) {
  const [copyStatus, setCopyStatus] = useState('');
  const document = draft.kind === 'INVOICE' || draft.kind === 'QUOTATION';
  async function copy() {
    try { await navigator.clipboard.writeText([draft.subject, draft.text].filter(Boolean).join('\n\n')); setCopyStatus('Draft text copied. Review it before saving or sending.'); }
    catch { setCopyStatus('Copy was unavailable. Select and copy the draft text above.'); }
  }
  return <Stack spacing={1}><Stack direction="row" spacing={1}>
    {!document ? <AppButton onClick={() => void copy()}>Copy draft text</AppButton> : null}
    <AppButton disabled={document && draft.lines.length === 0} onClick={() => onOpen(draft)}>{document ? 'Review in normal editor' : draft.kind === 'FOLLOW_UP' ? 'Open CRM' : 'Choose a quotation to email'}</AppButton>
  </Stack>{copyStatus ? <Typography role="status">{copyStatus}</Typography> : null}</Stack>;
}
function DocumentReview({ companyId, onReview }: { companyId?: number; onReview: (draft: Draft) => void }) {
  const [source, setSource] = useState<'PDF_TEXT' | 'EMAIL_TEXT'>('PDF_TEXT'); const [text, setText] = useState(''); const [checked, setChecked] = useState<number[]>([]);
  const extract = useMutation({ mutationFn: () => assistantApi.extract(source, text), onSuccess: () => setChecked([]) });
  function draft(result: Extraction, kind: 'INVOICE' | 'QUOTATION'): Draft { return { kind, unsaved: true, companyId: companyId!, customer: '', subject: '', text: '', href: kind === 'INVOICE' ? '/invoices/new' : '/quotations/new', lines: result.candidates.filter((row) => checked.includes(row.sourceLine)).map((row) => ({ itemId: null, itemName: row.itemName, quantity: row.quantity, unitRate: row.unitRate, taxRate: '0', measurementUnit: 'NOS', supplyType: 'GOODS', discountType: 'NONE', discountValue: '0' })) }; }
  return <Stack spacing={1}><Typography variant="h6">Review document text</Typography><Typography>Paste text copied from a PDF or email as description | quantity | unit rate. Raw PDF files, email accounts and external document connections are not connected.</Typography><TextField select label="Source" value={source} onChange={(event) => { setSource(event.target.value as typeof source); extract.reset(); }}><MenuItem value="PDF_TEXT">Copied PDF text</MenuItem><MenuItem value="EMAIL_TEXT">Copied email text</MenuItem></TextField><TextField multiline minRows={3} label="Untrusted source text" value={text} inputProps={{ maxLength: 30000 }} onChange={(event) => { setText(event.target.value); extract.reset(); setChecked([]); }} /><AppButton disabled={!text.trim()} isLoading={extract.isPending} onClick={() => extract.mutate()}>Extract candidates for review</AppButton>
    {extract.isError ? <Alert severity="error">{toApiError(extract.error).message}</Alert> : null}
    {extract.data ? <><Alert severity="info">{extract.data.message}{extract.data.truncated ? ' Only the first 500 source lines were inspected.' : ''}</Alert>{extract.data.candidates.map((row) => <FormControlLabel key={row.sourceLine} label={`${row.itemName} · quantity ${row.quantity} · rate ${row.unitRate}`} control={<Checkbox checked={checked.includes(row.sourceLine)} onChange={(_, enabled) => setChecked((current) => enabled ? [...current, row.sourceLine] : current.filter((id) => id !== row.sourceLine))} />)}<Typography>Check the candidate lines to copy to an editor, then review currency, unit, goods/service type and taxes before saving. Select a customer above first.</Typography><Stack direction="row" spacing={1}>{(['QUOTATION', 'INVOICE'] as const).map((kind) => <AppButton key={kind} disabled={!companyId || checked.length === 0 || checked.length > 100} onClick={() => onReview(draft(extract.data!, kind))}>Review {kind.toLowerCase()}</AppButton>)}</Stack></> : null}
  </Stack>;
}
