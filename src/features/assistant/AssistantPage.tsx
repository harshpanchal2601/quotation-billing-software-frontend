import { Alert, Box, Checkbox, Chip, Link as MuiLink, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PERMISSIONS, useAuth, useHasPermission } from '@features/auth';
import { toApiError } from '@shared/api/apiClient';
import { EmptyState } from '@shared/components/common/EmptyState';
import { formatExactDecimal } from '@shared/localization/presentation';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { AppButton } from '@shared/ui/actions';
import { AppDialog, ConfirmDialog } from '@shared/ui/dialogs';
import { formatBusinessAction, formatRecordStatus } from '@shared/ui/display';
import { useNotification } from '@shared/ui/feedback';
import { DetailActions, DetailFields, DetailSection, PageContainer, PageHeader, WorkspaceTabs } from '@shared/ui/layout';
import { AppTablePagination, RecordPagination, RecordTable, useTableSort } from '@shared/ui/tables';
import { assistantApi, type Draft, type Extraction, type History, type Proposal, type RecordLink, type Reply, type Status } from './assistant.api';
import { ProposalReview } from './ProposalReview';

type Turn = { id: string; question: string; reply: Reply };
type ChatRequest = { input: Parameters<typeof assistantApi.chat>[0]; question: string; targetId?: string };
type Tab = 'ask' | 'document' | 'history';
const tabs = [{ value: 'ask', label: 'Ask & search' }, { value: 'document', label: 'Review document text' }, { value: 'history', label: 'My history' }] as const;
const dateTime = (value: string) => new Date(value).toLocaleString();
const amount = (currency: string | undefined, value: string | undefined) => value == null ? '—' : `${currency ?? ''} ${formatExactDecimal(value, 'en-IN')}`.trim();
const draftLabel = (kind: Draft['kind']) => ({ QUOTATION: 'Quotation', INVOICE: 'Invoice', FOLLOW_UP: 'Follow-up', EMAIL: 'Email text' })[kind];

export function AssistantPage() {
  const firmId = useFirmId(); const { user } = useAuth();
  return <AssistantSession key={`${firmId}:${user?.id}`} />;
}
function AssistantSession() {
  const firmId = useFirmId(); const { user } = useAuth(); const cache = useQueryClient(); const navigate = useNavigate(); const notify = useNotification();
  const [params, setParams] = useSearchParams();
  const tab = tabs.find((entry) => entry.value === params.get('tab'))?.value ?? 'ask';
  const selectTab = (value: Tab) => setParams((current) => { const next = new URLSearchParams(current); next.set('tab', value); return next; }, { replace: true });
  const [message, setMessage] = useState(''); const [mode, setMode] = useState<'AUTO' | 'LOCAL' | 'LLM'>('AUTO');
  const [turns, setTurns] = useState<Turn[]>([]); const [conversationId, setConversationId] = useState<string>();
  const resultNodes = useRef(new Map<string, HTMLDivElement>());
  const [request, setRequest] = useState<ChatRequest | null>(null); const chatLock = useRef(false); const proposalLock = useRef(false);
  const [customer, setCustomer] = useState<RecordLink>(); const [items, setItems] = useState<RecordLink[]>([]);
  const [proposal, setProposal] = useState<{ value: Proposal; turn: Turn } | null>(null);
  const [usageOpen, setUsageOpen] = useState(false); const [resetOpen, setResetOpen] = useState(false);
  const canCustomers = useHasPermission(PERMISSIONS.COMPANIES_VIEW); const canItems = useHasPermission(PERMISSIONS.ITEMS_VIEW);
  const canPayments = useHasPermission(PERMISSIONS.PAYMENTS_VIEW); const canLocal = useHasPermission(PERMISSIONS.ASSISTANT_LOCAL);
  const canInvoice = useHasPermission(PERMISSIONS.INVOICES_ISSUE); const canQuoteStatus = useHasPermission(PERMISSIONS.QUOTATIONS_STATUS);
  const canOrder = useHasPermission(PERMISSIONS.SALES_ORDERS_MANAGE);
  const canCreateQuote = useHasPermission(PERMISSIONS.QUOTATIONS_CREATE); const canCreateInvoice = useHasPermission(PERMISSIONS.INVOICES_CREATE);
  const canCrm = useHasPermission(PERMISSIONS.CRM_MANAGE); const canQuote = useHasPermission(PERMISSIONS.QUOTATIONS_EMAIL);
  const status = useQuery({ queryKey: ['assistant-status', firmId, user?.id], queryFn: assistantApi.status, refetchInterval: 30000 });
  const chat = useMutation({
    mutationFn: (pending: ChatRequest) => assistantApi.chat(pending.input),
    onSuccess: (reply, pending) => {
      setTurns((current) => pending.targetId ? current.map((turn) => turn.id === pending.targetId ? { ...turn, reply } : turn) : [...current, { id: reply.requestId, question: pending.question, reply }]);
      setConversationId(reply.conversationId); if (!pending.targetId) setMessage(''); setRequest(null);
      void cache.invalidateQueries({ queryKey: ['assistant-status', firmId, user?.id] });
      void cache.invalidateQueries({ queryKey: ['assistant-history', firmId, user?.id] });
    },
    onSettled: () => { chatLock.current = false; },
  });
  const completedResultId = chat.data ? chat.variables?.targetId ?? chat.data.requestId : undefined;
  useEffect(() => {
    if (tab === 'ask' && completedResultId) resultNodes.current.get(completedResultId)?.scrollIntoView?.({ block: 'start' });
  }, [completedResultId, tab]);
  const propose = useMutation({
    mutationFn: ({ turn, command }: { turn: Turn; command: Record<string, unknown> }) => assistantApi.propose({ conversationId: turn.reply.conversationId, mode: turn.reply.mode, command }),
    onSuccess: (value, { turn }) => { setProposal({ value, turn }); void cache.invalidateQueries({ queryKey: ['assistant-history', firmId, user?.id] }); },
    onSettled: () => { proposalLock.current = false; },
  });
  const busy = chat.isPending || propose.isPending;
  function dispatch(pending: ChatRequest) {
    if (chatLock.current || proposalLock.current) return;
    chatLock.current = true; setRequest(pending); chat.mutate(pending);
  }
  function send(text: string, plan?: unknown) {
    dispatch({ input: { requestId: crypto.randomUUID(), conversationId, message: text, mode, ...(plan ? { plan } : {}) }, question: text });
  }
  function updateResult(turn: Turn, plan: Reply['plan']) {
    dispatch({ input: { requestId: crypto.randomUUID(), conversationId: turn.reply.conversationId, message: turn.question, mode: turn.reply.mode, plan }, question: turn.question, targetId: turn.id });
  }
  function submit(event: FormEvent) { event.preventDefault(); if (message.trim()) send(message.trim()); }
  function reset() { setTurns([]); setConversationId(undefined); setRequest(null); setCustomer(undefined); setItems([]); setMessage(''); setProposal(null); chat.reset(); propose.reset(); setResetOpen(false); }
  function review(turn: Turn, command: Record<string, unknown>) { if (chatLock.current || proposalLock.current) return; proposalLock.current = true; propose.mutate({ turn, command }); }
  function openDraft(draft: Draft) {
    if (draft.kind === 'INVOICE' || draft.kind === 'QUOTATION') navigate(draft.href, { state: { source: 'assistant', firmId, actorId: user!.id, kind: draft.kind, companyId: draft.companyId, lines: draft.lines } });
    else navigate(draft.href);
  }
  const ready = !!status.data?.mode;
  const draftKinds = ([canCreateQuote && 'QUOTATION', canCreateInvoice && 'INVOICE', canCrm && 'FOLLOW_UP', canQuote && 'EMAIL'] as const).filter((kind): kind is Draft['kind'] => !!kind);
  return <PageContainer><PageHeader title="Business assistant" description="Find records, check balances and prepare drafts for review." actions={<DetailActions label="Assistant options"><Chip size="small" color={ready ? 'success' : 'default'} label={status.isPending ? 'Checking availability…' : status.data?.mode === 'LLM' ? 'Connected assistant ready' : ready ? 'Local assistant ready' : 'Assistant unavailable'} /><AppButton variant="outlined" onClick={() => setUsageOpen(true)}>Usage & connection</AppButton>{user?.accountType === 'FIRM_ADMIN' ? <AppButton component={Link} to="/settings/assistant" variant="outlined">Assistant settings</AppButton> : null}</DetailActions>} />
    <Stack spacing={3}>
      {status.isError ? <Alert severity="error" action={<AppButton onClick={() => void status.refetch()}>Retry</AppButton>}>{toApiError(status.error).message}</Alert> : null}
      <WorkspaceTabs value={tab} items={tabs} label="Assistant workspace" onChange={selectTab} />
      <Box hidden={tab !== 'ask'}><Stack spacing={3}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 2fr) minmax(280px, 1fr)' }, gap: 3, alignItems: 'start' }}>
          <DetailSection title="What would you like to find?" description="Start with a customer, item, quotation or report. You review any changes before they happen.">
            <Stack component="form" onSubmit={submit} spacing={2}>
              <TextField select size="small" label="Assistant mode" value={mode} disabled={busy} onChange={(event) => setMode(event.target.value as typeof mode)} sx={{ maxWidth: 300 }}><MenuItem value="AUTO">Automatic</MenuItem><MenuItem value="LOCAL" disabled={!status.data?.localAllowed}>Local assistant</MenuItem><MenuItem value="LLM" disabled={status.data?.mode !== 'LLM'}>Connected ChatGPT</MenuItem></TextField>
              <TextField multiline minRows={3} label="Your question" placeholder="For example: Find customers named ABC" value={message} disabled={busy} onChange={(event) => setMessage(event.target.value)} inputProps={{ maxLength: 4000 }} />
              <DetailActions label="Question actions"><AppButton type="submit" variant="contained" disabled={!message.trim() || !ready || busy} isLoading={chat.isPending}>Ask assistant</AppButton><AppButton disabled={busy || (!turns.length && !message && !customer && !items.length)} onClick={() => setResetOpen(true)}>New conversation</AppButton></DetailActions>
              <Box><Typography variant="caption" color="text.secondary">Try a quick search</Typography><DetailActions label="Suggested questions">{canCustomers ? <AppButton disabled={!ready || busy} onClick={() => send('Find customers')}>Find customers</AppButton> : null}{canItems ? <AppButton disabled={!ready || busy} onClick={() => send('Find items')}>Find items</AppButton> : null}{canPayments ? <AppButton disabled={!ready || busy} onClick={() => send('Outstanding invoices')}>Outstanding invoices</AppButton> : null}</DetailActions></Box>
            </Stack>
          </DetailSection>
          <DetailSection title="Prepare a draft" description="Choose a customer from search results, then add any items you need."><Stack spacing={2}>
            <DetailFields columns={1} fields={[{ label: 'Customer', value: customer ? <MuiLink component={Link} to={customer.href}>{customer.label}</MuiLink> : 'No customer selected' }, { label: 'Items selected', value: `${items.length} of 25` }]} />
            {customer ? <AppButton onClick={() => setCustomer(undefined)} disabled={busy}>Clear customer</AppButton> : <AppButton disabled={!canCustomers || !ready || busy} onClick={() => send('Find customers')}>Choose a customer</AppButton>}
            {items.length ? <Stack direction="row" useFlexGap flexWrap="wrap" gap={1}>{items.map((item) => <Chip key={item.id} label={item.label} disabled={busy} onDelete={() => setItems((current) => current.filter((row) => row.id !== item.id))} />)}</Stack> : null}
            {canLocal && draftKinds.length ? <DetailActions label="Draft types">{draftKinds.map((kind) => <AppButton key={kind} variant="outlined" disabled={!customer || !ready || busy} onClick={() => send(`Prepare ${draftLabel(kind).toLowerCase()} draft`, { tool: 'DRAFT', kind, companyId: customer!.id, itemIds: items.map((item) => item.id) })}>{draftLabel(kind)}</AppButton>)}</DetailActions> : null}
            <Typography variant="caption" color="text.secondary">Drafts are not saved or sent until you review them in the editor.</Typography>
          </Stack></DetailSection>
        </Box>
        {chat.isPending ? <Typography role="status">Reading records you have permission to view…</Typography> : null}
        {chat.isError ? <Alert severity="error" action={request ? <AppButton disabled={busy} onClick={() => dispatch(request)}>Retry request</AppButton> : undefined}>{toApiError(chat.error).message}</Alert> : null}
        {propose.isError ? <Alert severity="error">{toApiError(propose.error).message}</Alert> : null}
        {!turns.length && !chat.isPending ? <EmptyState title="Your results will appear here" description="Ask a question or use a quick search to get started." /> : null}
        {turns.map((turn) => <Box key={turn.id} ref={(node: HTMLDivElement | null) => { if (node) resultNodes.current.set(turn.id, node); else resultNodes.current.delete(turn.id); }} sx={{ scrollMarginTop: 10 }}><DetailSection title={turn.question} description={turn.reply.mode === 'LOCAL' ? 'Answered using your firm records' : 'Answered using your connected assistant'}>
          <Stack spacing={2}>
            {turn.reply.result.message ? <Typography>{turn.reply.result.message}</Typography> : null}
            {turn.reply.fallback ? <Typography variant="caption" color="text.secondary">Answered locally. Connected ChatGPT is not available for this request.</Typography> : null}
            <SearchResults turn={turn} busy={busy} customer={customer} items={items} onCustomer={setCustomer} onItem={(record, checked) => setItems((current) => checked ? current.some((row) => row.id === record.id) || current.length >= 25 ? current : [...current, record] : current.filter((row) => row.id !== record.id))} onUpdate={(plan) => updateResult(turn, plan)} onReview={(command) => review(turn, command)} canInvoice={canInvoice} canQuoteStatus={canQuoteStatus} canOrder={canOrder} />
            <ReportResults turn={turn} busy={busy} onPage={(page) => updateResult(turn, { ...turn.reply.plan, page })} />
            {turn.reply.result.kind ? <DraftPreview draft={turn.reply.result as Draft} onOpen={openDraft} /> : null}
          </Stack>
        </DetailSection></Box>)}
      </Stack></Box>
      <Box hidden={tab !== 'document'}><DocumentReview customer={customer} enabled={canLocal && canItems} canQuote={canCreateQuote} canInvoice={canCreateInvoice} onReview={openDraft} onFindCustomer={() => selectTab('ask')} /></Box>
      <Box hidden={tab !== 'history'}><HistoryPanel active={tab === 'history'} busy={busy} onErased={(id) => { if (conversationId === id) reset(); }} /></Box>
    </Stack>
    <AppDialog open={usageOpen} title="Assistant usage & connection" onClose={() => setUsageOpen(false)} actions={<AppButton onClick={() => setUsageOpen(false)}>Close</AppButton>}><UsageDetails status={status.data} /></AppDialog>
    <ConfirmDialog open={resetOpen} title="Start a new conversation?" confirmLabel="Start new conversation" onClose={() => setResetOpen(false)} onConfirm={reset}><Typography>Your current questions and selected records will be cleared from this workspace. Saved business records and your request history will stay available.</Typography></ConfirmDialog>
    {proposal ? <ProposalReview key={proposal.value.id} proposal={proposal.value} onClose={() => setProposal(null)} onCancelled={() => { notify('Action review cancelled. No business record was changed.'); void cache.invalidateQueries({ queryKey: ['assistant-history', firmId, user?.id] }); }} onExecuted={async () => { await cache.invalidateQueries({ predicate: (query) => query.queryKey[0] !== 'auth' }); if (proposal.turn.reply.plan.tool === 'SEARCH') updateResult(proposal.turn, proposal.turn.reply.plan); }} /> : null}
  </PageContainer>;
}

function SearchResults({ turn, busy, customer, items, onCustomer, onItem, onUpdate, onReview, canInvoice, canQuoteStatus, canOrder }: { turn: Turn; busy: boolean; customer?: RecordLink; items: RecordLink[]; onCustomer: (record: RecordLink) => void; onItem: (record: RecordLink, checked: boolean) => void; onUpdate: (plan: Reply['plan']) => void; onReview: (command: Record<string, unknown>) => void; canInvoice: boolean; canQuoteStatus: boolean; canOrder: boolean }) {
  const { reply } = turn; const { records, pagination } = reply.result;
  if (!records) return null;
  const selectable = reply.plan.resource === 'CUSTOMERS' || reply.plan.resource === 'ITEMS';
  const hasActions = selectable || reply.plan.resource === 'INVOICES' && canInvoice || reply.plan.resource === 'QUOTATIONS' && (canQuoteStatus || canOrder);
  return <Stack spacing={2} aria-busy={busy}>
    {selectable ? <Typography variant="body2" color="text.secondary">{reply.plan.resource === 'CUSTOMERS' ? 'Choose one customer to use when preparing a draft.' : `Choose up to 25 items for your draft. ${items.length} selected.`}</Typography> : null}
    <RecordTable rows={records} rowKey={(row) => row.id} label="Assistant search results" rowNumberStart={((pagination?.page ?? 1) - 1) * 20 + 1} emptyMessage="Try another name or a broader search. Only records you can access are included." sorting={{ sortBy: reply.plan.sortBy ?? '', sortOrder: reply.plan.sortOrder ?? 'desc', fields: [{ key: 'id', label: 'Record number' }], onChange: (sort) => { if (!busy) onUpdate({ ...reply.plan, page: 1, sortBy: sort.sortBy as 'id', sortOrder: sort.sortOrder }); } }} columns={[
      { key: 'record', label: 'Record', minWidth: 240, sortKey: 'id', render: (record) => <Stack><MuiLink component={Link} to={record.href}>{record.label}</MuiLink><Typography variant="caption" color="text.secondary">Record #{record.id}</Typography></Stack> },
      ...(records.some((record) => record.customer) ? [{ key: 'customer', label: 'Customer', render: (record: RecordLink) => record.customer ?? '—' }] : []),
      ...(records.some((record) => record.status) ? [{ key: 'status', label: 'Status', render: (record: RecordLink) => record.status ? formatRecordStatus(record.status) : '—' }] : []),
      ...(records.some((record) => record.total != null) ? [{ key: 'total', label: 'Total', align: 'right' as const, render: (record: RecordLink) => amount(record.currency, record.total) }] : []),
      ...(hasActions ? [{ key: 'actions', label: 'Actions', minWidth: 210, render: (record: RecordLink) => <DetailActions label={`Actions for ${record.label}`}>
        {reply.plan.resource === 'CUSTOMERS' ? <AppButton disabled={busy || customer?.id === record.id} variant={customer?.id === record.id ? 'contained' : 'outlined'} onClick={() => onCustomer(record)}>{customer?.id === record.id ? 'Selected customer' : 'Use customer'}</AppButton> : null}
        {reply.plan.resource === 'ITEMS' ? <Checkbox inputProps={{ 'aria-label': `Include ${record.label} in draft` }} checked={items.some((item) => item.id === record.id)} disabled={busy || items.length >= 25 && !items.some((item) => item.id === record.id)} onChange={(_, checked) => onItem(record, checked)} /> : null}
        {reply.plan.resource === 'INVOICES' && record.status === 'DRAFT' && canInvoice ? <AppButton disabled={busy} onClick={() => onReview({ action: 'INVOICE_ISSUE', entityId: record.id, expectedVersion: record.version, confirmedTotal: record.total })}>Review issue invoice</AppButton> : null}
        {reply.plan.resource === 'QUOTATIONS' && ['DRAFT', 'PENDING'].includes(record.status ?? '') && canQuoteStatus ? <AppButton disabled={busy} onClick={() => onReview({ action: 'QUOTATION_SEND', entityId: record.id, status: 'SENT' })}>Review mark as sent</AppButton> : null}
        {reply.plan.resource === 'QUOTATIONS' && record.status === 'ACCEPTED' && canOrder ? <AppButton disabled={busy} onClick={() => onReview({ action: 'ORDER_CONFIRM', entityId: record.id, idempotencyKey: crypto.randomUUID() })}>Review sales order</AppButton> : null}
      </DetailActions> }] : []),
    ]} />
    {pagination ? <RecordPagination pagination={{ ...pagination, limit: 20 }} page={pagination.page} change={(page) => { if (!busy) onUpdate({ ...reply.plan, page }); }} /> : null}
  </Stack>;
}
function ReportResults({ turn, busy, onPage }: { turn: Turn; busy: boolean; onPage: (page: number) => void }) {
  const result = turn.reply.result;
  return <Stack spacing={2}>
    {result.currencies ? <><Typography variant="body2">Issued-document sales from {result.dateFrom ?? 'the first recorded sale'} to {result.dateTo ?? 'today'}. Credit notes reduce sales. Receipts are reported separately.</Typography><RecordTable label="Sales summary" rows={result.currencies} rowKey={(row) => row.currency} columns={[{ key: 'currency', label: 'Currency', render: (row) => row.currency, sortValue: (row) => row.currency }, { key: 'netSales', label: 'Net sales', align: 'right', render: (row) => amount(row.currency, row.netSales), sortValue: (row) => row.netSales }, { key: 'documents', label: 'Documents', align: 'right', render: (row) => row.documents, sortValue: (row) => row.documents }]} emptyMessage="No issued sales match this report." /><AppButton component={Link} to="/invoices">View billing documents</AppButton></> : null}
    {result.buckets ? <RecordTable label="Outstanding balances by age" rows={result.buckets} rowKey={(row) => `${row.currency}:${row.bucket}`} columns={[{ key: 'bucket', label: 'Age of balance', render: (row) => formatRecordStatus(row.bucket), sortValue: (row) => row.bucket }, { key: 'currency', label: 'Currency', render: (row) => row.currency, sortValue: (row) => row.currency }, { key: 'amount', label: 'Outstanding', align: 'right', render: (row) => amount(row.currency, row.amount), sortValue: (row) => row.amount }, { key: 'count', label: 'Invoices', align: 'right', render: (row) => row.count, sortValue: (row) => row.count }]} /> : null}
    {result.receivables ? <><RecordTable label="Outstanding invoices" rows={result.receivables} rowKey={(row) => row.id} rowNumberStart={((result.pagination?.page ?? 1) - 1) * 20 + 1} emptyMessage="No outstanding invoices match this request." columns={[{ key: 'document', label: 'Invoice', render: (row) => <MuiLink component={Link} to={row.href}>{row.documentNumber}</MuiLink> }, { key: 'company', label: 'Customer', render: (row) => row.companyName }, { key: 'outstanding', label: 'Outstanding', align: 'right', render: (row) => amount(row.currency, row.outstanding) }]} />{result.pagination ? <RecordPagination pagination={{ ...result.pagination, limit: 20 }} page={result.pagination.page} change={(page) => { if (!busy) onPage(page); }} /> : null}</> : null}
    {result.customerCredits ? <RecordTable label="Available customer credit" rows={result.customerCredits} rowKey={(row) => row.currency} columns={[{ key: 'currency', label: 'Currency', render: (row) => row.currency, sortValue: (row) => row.currency }, { key: 'amount', label: 'Available credit', align: 'right', render: (row) => amount(row.currency, row.unapplied), sortValue: (row) => row.unapplied }]} /> : null}
  </Stack>;
}
function DraftPreview({ draft, onOpen }: { draft: Draft; onOpen: (draft: Draft) => void }) {
  const notify = useNotification(); const document = draft.kind === 'INVOICE' || draft.kind === 'QUOTATION';
  async function copy() { try { await navigator.clipboard.writeText([draft.subject, draft.text].filter(Boolean).join('\n\n')); notify('Draft text copied. Review it before sending.'); } catch { notify('Copy was unavailable. Select and copy the draft text.', 'error'); } }
  return <Stack spacing={2}><DetailFields fields={[{ label: 'Draft type', value: draftLabel(draft.kind) }, { label: 'Customer', value: draft.customer }]} /><Chip label="Not saved" size="small" sx={{ alignSelf: 'flex-start' }} />
    {draft.subject ? <Typography fontWeight={600}>{draft.subject}</Typography> : null}{draft.text ? <Typography sx={{ whiteSpace: 'pre-wrap' }}>{draft.text}</Typography> : null}
    {document ? <RecordTable label="Draft items" rows={draft.lines.map((line, index) => ({ ...line, index }))} rowKey={(row) => row.index} columns={[{ key: 'item', label: 'Item', render: (row) => row.itemName, sortValue: (row) => row.itemName }, { key: 'quantity', label: 'Quantity', align: 'right', render: (row) => `${row.quantity} ${row.measurementUnit}`, sortValue: (row) => row.quantity }, { key: 'rate', label: 'Unit rate', align: 'right', render: (row) => formatExactDecimal(row.unitRate, 'en-IN'), sortValue: (row) => row.unitRate }]} /> : null}
    <DetailActions label="Review draft">{!document ? <AppButton onClick={() => void copy()}>Copy draft text</AppButton> : null}<AppButton variant="contained" disabled={document && !draft.lines.length} onClick={() => onOpen(draft)}>{document ? 'Review in editor' : draft.kind === 'FOLLOW_UP' ? 'Open CRM' : 'Choose quotation to email'}</AppButton></DetailActions>
    {document && !draft.lines.length ? <Typography variant="body2">Select items and prepare the draft again, or create it from the quotation or invoice page.</Typography> : null}
  </Stack>;
}
function UsageDetails({ status }: { status?: Status }) {
  if (!status) return <Typography>Usage details are not available yet. Close this window and retry the availability check.</Typography>;
  const connection = formatRecordStatus(status.connection);
  return <Stack spacing={3}><Alert severity="info">{status.mode === 'LLM' ? 'Connected ChatGPT is available.' : status.localAllowed ? 'The local assistant can search your records without a ChatGPT connection.' : 'Assistant access is not available. Ask your firm administrator to review your plan and permissions.'}</Alert><DetailFields fields={[{ label: 'Current assistant', value: status.mode === 'LLM' ? 'Connected ChatGPT' : status.mode === 'LOCAL' ? 'Local assistant' : 'Unavailable' }, { label: 'ChatGPT connection', value: connection }, { label: 'Connected requests used', value: `${status.credits.used} / ${status.credits.limit ?? 'No plan limit'}` }, { label: 'Connected attempts today', value: status.todayRequests }, { label: 'Daily request limit', value: status.settings.dailyLlmRequests ?? 'Not set' }, { label: 'Conversation text storage', value: status.settings.retainContentDays ? `${status.settings.retainContentDays} days` : 'Off' }]} /><Typography variant="body2" color="text.secondary">Daily limits reset at {status.dailyResetTimezone === 'UTC' ? '05:30 India time (00:00 UTC)' : `midnight in ${status.dailyResetTimezone}`}. Required action audit and usage records are kept separately from conversation text.</Typography></Stack>;
}
function DocumentReview({ customer, enabled, canQuote, canInvoice, onReview, onFindCustomer }: { customer?: RecordLink; enabled: boolean; canQuote: boolean; canInvoice: boolean; onReview: (draft: Draft) => void; onFindCustomer: () => void }) {
  const [source, setSource] = useState<'PDF_TEXT' | 'EMAIL_TEXT'>('PDF_TEXT'); const [text, setText] = useState(''); const [checked, setChecked] = useState<number[]>([]); const lock = useRef(false);
  const extract = useMutation({ mutationFn: () => assistantApi.extract(source, text), onSuccess: () => setChecked([]), onSettled: () => { lock.current = false; } });
  function draft(result: Extraction, kind: 'INVOICE' | 'QUOTATION'): Draft { return { kind, unsaved: true, companyId: customer!.id, customer: customer!.label, subject: '', text: '', href: kind === 'INVOICE' ? '/invoices/new' : '/quotations/new', lines: result.candidates.filter((row) => checked.includes(row.sourceLine)).map((row) => ({ itemId: null, itemName: row.itemName, quantity: row.quantity, unitRate: row.unitRate, taxRate: '0', measurementUnit: 'NOS', supplyType: 'GOODS', discountType: 'NONE', discountValue: '0' })) }; }
  if (!enabled) return <EmptyState title="Document review is unavailable" description="Your account needs local assistant and item access to review copied document text." />;
  return <DetailSection title="Review document text" description="Copy lines from a PDF or email. Check the suggested items before opening an editor."><Stack spacing={3}>
    <Alert severity="info">Nothing is imported or saved automatically. Use one line per item: description | quantity | unit rate.</Alert>
    <TextField select size="small" label="Text copied from" value={source} disabled={extract.isPending} onChange={(event) => { setSource(event.target.value as typeof source); extract.reset(); setChecked([]); }} sx={{ maxWidth: 300 }}><MenuItem value="PDF_TEXT">PDF document</MenuItem><MenuItem value="EMAIL_TEXT">Email</MenuItem></TextField>
    <TextField multiline minRows={4} label="Copied document text" placeholder="Steel bracket | 2 | 25.50" value={text} disabled={extract.isPending} inputProps={{ maxLength: 30000 }} onChange={(event) => { setText(event.target.value); extract.reset(); setChecked([]); }} />
    <DetailActions label="Document text actions"><AppButton variant="contained" disabled={!text.trim() || extract.isPending} isLoading={extract.isPending} onClick={() => { if (lock.current) return; lock.current = true; extract.mutate(); }}>Find item lines</AppButton></DetailActions>
    {extract.isError ? <Alert severity="error">{toApiError(extract.error).message}</Alert> : null}
    {extract.data ? <><Typography variant="body2">{extract.data.message}{extract.data.truncated ? ' Only the first 500 source lines were checked.' : ''}</Typography><RecordTable label="Suggested document items" rows={extract.data.candidates} rowKey={(row) => row.sourceLine} emptyMessage="No item lines were found. Use description | quantity | unit rate, then try again." columns={[{ key: 'select', label: 'Include', minWidth: 70, render: (row) => <Checkbox inputProps={{ 'aria-label': `Include ${row.itemName}` }} checked={checked.includes(row.sourceLine)} onChange={(_, selected) => setChecked((current) => selected ? [...current, row.sourceLine] : current.filter((line) => line !== row.sourceLine))} /> }, { key: 'item', label: 'Item description', minWidth: 240, render: (row) => row.itemName, sortValue: (row) => row.itemName }, { key: 'quantity', label: 'Quantity', align: 'right', render: (row) => row.quantity, sortValue: (row) => row.quantity }, { key: 'rate', label: 'Unit rate', align: 'right', render: (row) => formatExactDecimal(row.unitRate, 'en-IN'), sortValue: (row) => row.unitRate }]} />
      <DetailFields fields={[{ label: 'Customer', value: customer?.label ?? 'Choose a customer in Ask & search' }, { label: 'Lines selected', value: checked.length }]} />
      {!customer ? <AppButton onClick={onFindCustomer}>Find a customer</AppButton> : null}
      <Typography variant="body2" color="text.secondary">Review the currency, unit, goods or service type and taxes in the editor. Suggested descriptions have not been matched to your item catalogue.</Typography>
      <DetailActions label="Review selected document items">{(['QUOTATION', 'INVOICE'] as const).filter((kind) => kind === 'QUOTATION' ? canQuote : canInvoice).map((kind) => <AppButton key={kind} variant="outlined" disabled={!customer || !checked.length || checked.length > 100} onClick={() => onReview(draft(extract.data!, kind))}>Review {draftLabel(kind).toLowerCase()}</AppButton>)}</DetailActions>
    </> : null}
  </Stack></DetailSection>;
}
function HistoryPanel({ active, busy, onErased }: { active: boolean; busy: boolean; onErased: (id: string) => void }) {
  const firmId = useFirmId(); const { user } = useAuth(); const cache = useQueryClient(); const notify = useNotification();
  const [page, setPage] = useState(1); const [view, setView] = useState<History['conversations'][number] | null>(null); const [eraseId, setEraseId] = useState<string | null>(null); const lock = useRef(false);
  const sorting = useTableSort([{ key: 'createdAt', label: 'Started at' }, { key: 'id', label: 'Conversation reference' }], { defaultSortBy: 'createdAt', defaultSortOrder: 'desc', paramPrefix: 'assistantHistory', onChange: () => setPage(1) });
  const sort = { sortBy: sorting.sortBy as 'createdAt' | 'id', sortOrder: sorting.sortOrder };
  const history = useQuery({ queryKey: ['assistant-history', firmId, user?.id, page, sort], queryFn: () => assistantApi.history(page, sort), enabled: active });
  const erase = useMutation({ mutationFn: assistantApi.erase, onSuccess: async (_, id) => { setEraseId(null); setView(null); onErased(id); notify('Conversation content cleared and conversation closed.'); await cache.invalidateQueries({ queryKey: ['assistant-history', firmId, user?.id] }); }, onSettled: () => { lock.current = false; } });
  useEffect(() => { if (history.data?.page === page && page > 1 && !history.data.conversations.length) setPage((current) => current - 1); }, [history.data, page]);
  return <DetailSection title="My request history" description="Only your own conversations appear here. This list contains request and action records, not stored conversation text."><Stack spacing={2}>
    {history.isPending ? <Typography role="status">Loading your history…</Typography> : null}
    {history.isError ? <Alert severity="error" action={<AppButton onClick={() => void history.refetch()}>Retry</AppButton>}>{toApiError(history.error).message}</Alert> : null}
    {history.data ? <><RecordTable label="Assistant conversation history" rows={history.data.conversations} rowKey={(row) => row.id} rowNumberStart={(page - 1) * 20 + 1} sorting={sorting} emptyMessage="Start a conversation in Ask & search to see your request history." columns={[{ key: 'created', label: 'Started at', sortKey: 'createdAt', render: (row) => dateTime(row.createdAt) }, { key: 'reference', label: 'Conversation reference', sortKey: 'id', render: (row) => row.id }, { key: 'activity', label: 'Recent activity', render: (row) => `${row.messages.length} request${row.messages.length === 1 ? '' : 's'} · ${row.proposals.length} action review${row.proposals.length === 1 ? '' : 's'}` }, { key: 'actions', label: 'Actions', minWidth: 240, render: (row) => <DetailActions label="Conversation actions"><AppButton onClick={() => setView(row)}>View history</AppButton><AppButton disabled={busy || erase.isPending} onClick={() => { erase.reset(); setEraseId(row.id); }}>Clear content & close</AppButton></DetailActions> }]} /><Typography variant="caption" color="text.secondary">Each conversation shows up to 20 recent requests and 20 action reviews. Required audit and usage records remain after clearing content.</Typography><AppTablePagination count={history.data.hasMore ? -1 : (page - 1) * 20 + history.data.conversations.length} page={page} rowsPerPage={20} rowsPerPageOptions={[20]} onPageChange={setPage} onRowsPerPageChange={() => setPage(1)} /></> : null}
    <AppDialog open={!!view} title="Conversation history" maxWidth="lg" onClose={() => setView(null)} actions={<AppButton onClick={() => setView(null)}>Close</AppButton>}>{view ? <Stack spacing={3}><DetailFields fields={[{ label: 'Started at', value: dateTime(view.createdAt) }, { label: 'Conversation reference', value: view.id }]} /><RecordTable label="Recent assistant requests" rows={view.messages} rowKey={(row) => row.id} columns={[{ key: 'created', label: 'Requested at', render: (row) => dateTime(row.createdAt), sortValue: (row) => row.createdAt }, { key: 'mode', label: 'Assistant', render: (row) => row.mode === 'LLM' ? 'Connected ChatGPT' : 'Local assistant', sortValue: (row) => row.mode }, { key: 'tool', label: 'Request', render: (row) => requestLabel(row.tool), sortValue: (row) => row.tool }, { key: 'status', label: 'Status', render: (row) => formatRecordStatus(row.status), sortValue: (row) => row.status }, { key: 'error', label: 'Details', render: (row) => row.errorCode ? formatRecordStatus(row.errorCode) : '—' }]} /><RecordTable label="Recent assistant action reviews" rows={view.proposals} rowKey={(row) => row.id} columns={[{ key: 'action', label: 'Action', render: (row) => formatBusinessAction(row.command.action, row.command.status), sortValue: (row) => formatBusinessAction(row.command.action, row.command.status) }, { key: 'status', label: 'Status', render: (row) => formatRecordStatus(row.status), sortValue: (row) => row.status }, { key: 'result', label: 'Result', render: (row) => row.execution ? <MuiLink component={Link} to={row.execution.result.href}>Open result</MuiLink> : 'No completed action' }]} /></Stack> : null}</AppDialog>
    <ConfirmDialog open={!!eraseId} title="Clear conversation content?" confirmLabel="Clear content & close" confirmColor="error" isConfirming={erase.isPending} onClose={() => setEraseId(null)} onConfirm={() => { if (!eraseId || lock.current) return; lock.current = true; erase.mutate(eraseId); }}><Stack spacing={2}><DetailFields fields={[{ label: 'Conversation reference', value: eraseId }, { label: 'Started at', value: history.data?.conversations.find((row) => row.id === eraseId)?.createdAt ? dateTime(history.data.conversations.find((row) => row.id === eraseId)!.createdAt) : '—' }]} /><Typography>Stored text for this conversation will be cleared, the conversation will close and pending action reviews will be cancelled. This cannot be undone. Business records, required audit records and usage history will remain.</Typography>{erase.isError ? <Alert severity="error">{toApiError(erase.error).message}</Alert> : null}</Stack></ConfirmDialog>
  </Stack></DetailSection>;
}
function requestLabel(tool: string | null) { return tool === 'SEARCH' ? 'Record search' : tool === 'OUTSTANDING' ? 'Outstanding invoices' : tool === 'SALES' ? 'Sales report' : tool === 'DRAFT' ? 'Draft preparation' : 'Question'; }
