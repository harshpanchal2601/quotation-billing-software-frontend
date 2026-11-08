import Alert from '@mui/material/Alert';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PERMISSIONS, useHasPermission } from '@features/auth';
import { InvoiceSettlementPanel } from '@features/payments';
import { InvoiceFieldHistory } from '@features/automation';
import { toApiError } from '@shared/api/apiClient';
import { ErrorState } from '@shared/components/common/ErrorState';
import { FullPageLoader } from '@shared/components/common/FullPageLoader';
import { AppButton } from '@shared/ui/actions';
import { PageContainer, PageHeader } from '@shared/ui/layout';
import { convertProformaToInvoice, createBillingAdjustment, fetchBillingPdf, generateBillingPdf, getBillingDocument, issueBillingDocument, listBillingPdfs, updateCustomValues, voidBillingDocument } from '../api/invoices.api';
import { CustomFieldsForm } from '../components/CustomFieldsForm';
import { cancelOrderInvoiceDraft } from '../api/invoices.api';
import { invoicesQueryKeys, useBillingFirmId } from '../model/invoices.query-keys';
import type { AdjustmentDraft, BillingScope, CustomValues, InvoiceDocument } from '../model/invoices.types';

const scopePermissions = {
  invoices: { edit: PERMISSIONS.INVOICES_EDIT, issue: PERMISSIONS.INVOICES_ISSUE, void: PERMISSIONS.INVOICES_VOID, documents: PERMISSIONS.INVOICES_DOCUMENTS },
  proformas: { edit: PERMISSIONS.PROFORMAS_MANAGE, issue: PERMISSIONS.PROFORMAS_MANAGE, void: PERMISSIONS.PROFORMAS_MANAGE, documents: PERMISSIONS.PROFORMAS_MANAGE },
  'billing-adjustments': { edit: PERMISSIONS.ADJUSTMENTS_MANAGE, issue: PERMISSIONS.ADJUSTMENTS_MANAGE, void: PERMISSIONS.ADJUSTMENTS_MANAGE, documents: PERMISSIONS.ADJUSTMENTS_MANAGE },
};
export function InvoiceDetailsPage({ scope = 'invoices' }: { scope?: BillingScope }) {
  const { id } = useParams(); const documentId = Number(id); const firmId = useBillingFirmId();
  const query = useQuery({ queryKey: invoicesQueryKeys.detail(firmId, scope, documentId), queryFn: ({ signal }) => getBillingDocument(scope, documentId, signal), enabled: Number.isSafeInteger(documentId) && documentId > 0 });
  if (!Number.isSafeInteger(documentId) || documentId <= 0) return <ErrorState message="Invalid document ID" />;
  if (query.isPending) return <FullPageLoader />;
  if (query.isError) return <ErrorState message={toApiError(query.error).message} onRetry={() => { void query.refetch(); }} />;
  return <InvoiceDetails key={`${firmId}:${documentId}:${query.data.version}`} scope={scope} document={query.data} />;
}
function InvoiceDetails({ scope, document }: { scope: BillingScope; document: InvoiceDocument }) {
  const firmId = useBillingFirmId(); const client = useQueryClient(); const navigate = useNavigate();
  const canEdit = useHasPermission(scopePermissions[scope].edit); const canIssue = useHasPermission(scopePermissions[scope].issue); const canVoid = useHasPermission(scopePermissions[scope].void); const canDocuments = useHasPermission(scopePermissions[scope].documents);
  const canCreateInvoice = useHasPermission(PERMISSIONS.INVOICES_CREATE); const canAdjust = useHasPermission(PERMISSIONS.ADJUSTMENTS_MANAGE);
  const canRecurring = useHasPermission(PERMISSIONS.BILLING_RECURRING);
  const [customValues, setCustomValues] = useState<CustomValues>(document.customFieldValues);
  const [confirmIssue, setConfirmIssue] = useState(false); const [voidOpen, setVoidOpen] = useState(false); const [adjustOpen, setAdjustOpen] = useState(false);
  const [voidReason, setVoidReason] = useState(''); const [voidConfirmed, setVoidConfirmed] = useState(false);
  const [cancelDraftOpen, setCancelDraftOpen] = useState(false);
  const [conversionKey] = useState(() => crypto.randomUUID()); const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  useEffect(() => () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); }, [pdfUrl]);
  const documents = useQuery({ queryKey: ['billing', firmId, scope, document.id, 'pdfs'], queryFn: ({ signal }) => listBillingPdfs(scope, document.id, signal), enabled: canDocuments });
  const mutation = useMutation({ mutationFn: (action: () => Promise<unknown>) => action(), onSuccess: () => { void client.invalidateQueries({ queryKey: invoicesQueryKeys.firm(firmId) }); void client.invalidateQueries({ queryKey: ['payments', firmId] }); void client.invalidateQueries({ queryKey: ['sales-orders', firmId] }); setConfirmIssue(false); setVoidOpen(false); setCancelDraftOpen(false); } });
  const draft = document.status === 'DRAFT'; const sourceLocked = Boolean(document.sourceQuotationId || document.sourceProformaId || document.sourceInvoiceId || document.sourceSalesOrderId);
  async function openPdf(pdfId: number, download: boolean) {
    const blob = await fetchBillingPdf(scope, document.id, pdfId); const url = URL.createObjectURL(blob);
    if (!download) { setPdfUrl(url); return; }
    const link = window.document.createElement('a'); link.href = url; link.download = `${document.documentNumber?.replace(/\//g, '-') ?? document.id}.pdf`; link.click(); URL.revokeObjectURL(url);
  }
  return <PageContainer><PageHeader title={document.documentNumber ?? `Draft #${document.id}`} description={`${document.kind.replace(/_/g, ' ')} · ${document.status} · Version ${document.version}`} actions={<AppButton onClick={() => navigate(`/${scope}`)}>Back to list</AppButton>} />
    {mutation.isError ? <Alert severity="error">{toApiError(mutation.error).message}</Alert> : null}
    {document.kind === 'PROFORMA' ? <Alert severity="info">This proforma is non-posting and creates no receivable or tax invoice.</Alert> : null}
    {document.status === 'VOID' ? <Alert severity="warning">{document.issuedAt ? `Voided: ${document.voidReason}. The original issue snapshot and document history are preserved.` : `Draft cancelled: ${document.voidReason}. Reserved order quantities have been released.`}</Alert> : null}
    <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
      {draft && canEdit && !sourceLocked ? <AppButton onClick={() => navigate(`/${scope}/${document.id}/edit`)}>Edit draft</AppButton> : null}
      {draft && document.sourceSalesOrderId && canVoid ? <AppButton onClick={() => setCancelDraftOpen(true)}>Cancel order invoice draft</AppButton> : null}
      {draft && document.kind === 'INVOICE' && !sourceLocked && canRecurring && canCreateInvoice ? <AppButton onClick={() => navigate(`/billing-schedules?sourceDraftId=${document.id}`)}>Create recurring schedule</AppButton> : null}
      {draft && canIssue ? <AppButton variant="contained" onClick={() => setConfirmIssue(true)}>Issue {document.kind === 'PROFORMA' ? 'proforma' : 'document'}</AppButton> : null}
      {!draft && document.status === 'ISSUED' && canVoid && scope !== 'billing-adjustments' ? <AppButton color="error" onClick={() => setVoidOpen(true)}>Void document</AppButton> : null}
      {document.status === 'ISSUED' && canDocuments ? <AppButton isLoading={mutation.isPending} onClick={() => mutation.mutate(() => generateBillingPdf(scope, document.id))}>Generate PDF version</AppButton> : null}
      {document.status === 'ISSUED' && scope === 'proformas' && canCreateInvoice ? <AppButton isLoading={mutation.isPending} onClick={() => mutation.mutate(async () => { const created = await convertProformaToInvoice(document.id, conversionKey); navigate(`/invoices/${created.id}`); })}>Convert to invoice draft</AppButton> : null}
      {document.status === 'ISSUED' && scope === 'invoices' && canAdjust ? <AppButton onClick={() => setAdjustOpen(true)}>Create credit / debit note</AppButton> : null}
    </Stack>
    <Typography variant="h6">Customer</Typography><Typography>{document.buyerSnapshot.legalName || document.buyerSnapshot.name} · GSTIN {document.buyerSnapshot.gstin || 'Unregistered'}</Typography><Typography>{Object.values(document.buyerSnapshot.billingAddress ?? {}).filter((value) => typeof value === 'string' && value).join(', ')}</Typography>
    {document.sellerSnapshot ? <><Typography variant="h6">Supplier at issue</Typography><Typography>{document.sellerSnapshot.legalName} · {document.sellerSnapshot.gstin || 'Unregistered'} · {document.sellerSnapshot.stateName}</Typography></> : null}
    <Typography>Document date {document.invoiceDate} · Due {document.dueDate || 'Not specified'} · Place of supply {document.supplySnapshot.placeOfSupplyStateCode} · {document.financialPolicySnapshot.taxMode === 'CGST_SGST' ? `CGST + ${document.financialPolicySnapshot.localTaxLabel}` : document.financialPolicySnapshot.taxMode}</Typography>
    {document.sourceSnapshot ? <Alert severity="info">Source: {document.sourceSnapshot.orderNumber || document.sourceSnapshot.quotationNumber || document.sourceSnapshot.proformaNumber || document.sourceSnapshot.invoiceNumber}{document.sourceSnapshot.revisionNumber !== undefined ? ` · Exact quotation revision ${document.sourceSnapshot.revisionNumber}` : ''}. Source financial values are preserved.</Alert> : null}
    {document.adjustmentReason ? <Typography>Adjustment reason: {document.adjustmentReason}</Typography> : null}
    <Stack sx={{ overflowX: 'auto' }}><Table aria-label="Document lines"><TableHead><TableRow>{['Line', 'Goods / service', 'HSN / SAC', 'Quantity', 'Rate', 'Taxable', 'CGST', document.financialPolicySnapshot.localTaxLabel, 'IGST', 'Total'].map((label) => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead><TableBody>{document.lines.map((line) => <TableRow key={line.lineNumber}><TableCell>{line.lineNumber}</TableCell><TableCell>{line.itemName}</TableCell><TableCell>{line.hsnCode || 'Required before registered issuance'}</TableCell><TableCell>{line.quantity} {line.measurementUnit}</TableCell><TableCell>{line.unitRate}</TableCell><TableCell>{line.taxableAmount}</TableCell><TableCell>{line.cgstAmount}</TableCell><TableCell>{line.sgstAmount}</TableCell><TableCell>{line.igstAmount}</TableCell><TableCell>{line.lineTotal}</TableCell></TableRow>)}</TableBody></Table></Stack>
    <Typography>Subtotal {document.currency} {document.subtotal} · Discount {document.discountAmount} · Tax {document.taxAmount} · Round off {document.roundOffAmount}</Typography><Typography variant="h5">Total {document.currency} {document.grandTotal}</Typography>
    {document.sourceSnapshot?.extraCharges ? <Typography>{document.sourceSalesOrderId ? 'Allocated delivery charges and adjustment' : 'Freight and other charges'}: {document.currency} {document.sourceSnapshot.extraCharges}</Typography> : null}
    {document.paymentTerms ? <Typography sx={{ whiteSpace: 'pre-wrap' }}>Payment terms: {document.paymentTerms}</Typography> : null}
    <CustomFieldsForm fields={document.customFieldSchema} values={customValues} onChange={setCustomValues} disabled={!draft || !canEdit} />
    <InvoiceFieldHistory key={`${scope}:${document.id}:${document.version}`} scope={scope} entityId={document.id} />
    {draft && canEdit ? <AppButton isLoading={mutation.isPending} onClick={() => mutation.mutate(() => updateCustomValues(scope, document, customValues))}>Save additional values</AppButton> : null}
    {draft && canEdit ? <AppButton onClick={() => navigate(`/${scope}/${document.id}/fields`)}>Review latest custom-field configuration</AppButton> : null}
    {canDocuments ? <><Typography variant="h6">PDF history</Typography>{documents.isError ? <Alert severity="error">{toApiError(documents.error).message}</Alert> : documents.data?.length === 0 ? <Typography>No PDF versions yet.</Typography> : documents.data?.map((pdf) => <Stack key={pdf.id} direction="row" spacing={2} alignItems="center"><Typography>Version {pdf.versionNumber} · {new Date(pdf.generatedAt).toLocaleString()} · {pdf.fileSize} bytes</Typography><AppButton onClick={() => mutation.mutate(() => openPdf(pdf.id, false))}>Preview</AppButton><AppButton onClick={() => mutation.mutate(() => openPdf(pdf.id, true))}>Download</AppButton></Stack>)}</> : null}
    {document.kind === 'INVOICE' && document.status === 'ISSUED' ? <InvoiceSettlementPanel invoiceId={document.id} /> : null}
    <Typography variant="h6">Status history</Typography>{document.statusHistory.map((history) => <Typography key={history.version}>Version {history.version}: {history.fromStatus || 'Created'} → {history.toStatus} · Actor #{history.changedById} · {new Date(history.changedAt).toLocaleString()}</Typography>)}
    <Dialog open={confirmIssue} onClose={() => setConfirmIssue(false)}><DialogTitle>Issue this document?</DialogTitle><DialogContent><Typography>Confirm total {document.currency} {document.grandTotal}. The server assigns its issue date and number. Financial values and custom fields become immutable.</Typography></DialogContent><DialogActions><AppButton onClick={() => setConfirmIssue(false)}>Cancel</AppButton><AppButton variant="contained" isLoading={mutation.isPending} onClick={() => mutation.mutate(() => issueBillingDocument(scope, document))}>Confirm issuance</AppButton></DialogActions></Dialog>
    <Dialog open={voidOpen} onClose={() => setVoidOpen(false)}><DialogTitle>Void an unreported document</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}><Typography>This is limited to cancellation on the issue date. Use a credit/debit note for later corrections.</Typography><TextField label="Cancellation reason" required multiline value={voidReason} onChange={(event) => setVoidReason(event.target.value)} /><FormControlLabel control={<Checkbox checked={voidConfirmed} onChange={(event) => setVoidConfirmed(event.target.checked)} />} label="The supply is cancelled and this document has not been reported in GST returns." /></Stack></DialogContent><DialogActions><AppButton onClick={() => setVoidOpen(false)}>Close</AppButton><AppButton color="error" disabled={!voidConfirmed || voidReason.trim().length < 5} isLoading={mutation.isPending} onClick={() => mutation.mutate(() => voidBillingDocument(scope, document, voidReason))}>Void</AppButton></DialogActions></Dialog>
    <Dialog open={pdfUrl !== null} onClose={() => setPdfUrl(null)} fullWidth maxWidth="lg"><DialogTitle>Historical document PDF</DialogTitle><DialogContent>{pdfUrl ? <iframe src={pdfUrl} title="Billing PDF preview" style={{ width: '100%', height: '75vh', border: 0 }} /> : null}</DialogContent><DialogActions><AppButton onClick={() => setPdfUrl(null)}>Close</AppButton></DialogActions></Dialog>
    {adjustOpen ? <AdjustmentDialog source={document} onClose={() => setAdjustOpen(false)} /> : null}
    <Dialog open={cancelDraftOpen} onClose={() => setCancelDraftOpen(false)}><DialogTitle>Cancel order invoice draft</DialogTitle><DialogContent><Typography>Cancellation preserves this draft and releases its reserved order quantities.</Typography><TextField label="Cancellation reason" required value={voidReason} onChange={(event) => setVoidReason(event.target.value)} /></DialogContent><DialogActions><AppButton onClick={() => setCancelDraftOpen(false)}>Close</AppButton><AppButton disabled={mutation.isPending || voidReason.trim().length < 5} onClick={() => mutation.mutate(() => cancelOrderInvoiceDraft(document, voidReason))}>Confirm draft cancellation</AppButton></DialogActions></Dialog>
  </PageContainer>;
}
function AdjustmentDialog({ source, onClose }: { source: InvoiceDocument; onClose: () => void }) {
  const navigate = useNavigate(); const client = useQueryClient(); const firmId = useBillingFirmId();
  const [kind, setKind] = useState<'CREDIT_NOTE' | 'DEBIT_NOTE'>('CREDIT_NOTE'); const [reason, setReason] = useState('');
  const [key] = useState(() => crypto.randomUUID()); const [gstEligible, setGstEligible] = useState(false); const [itcReversed, setItcReversed] = useState(false); const [annualReturn, setAnnualReturn] = useState('');
  const [lines, setLines] = useState(source.lines.map((line) => ({ included: false, sourceLineNumber: line.lineNumber, quantity: '1', unitRate: line.unitRate })));
  const save = useMutation({ mutationFn: (input: AdjustmentDraft) => createBillingAdjustment(input), onSuccess: (created) => { void client.invalidateQueries({ queryKey: invoicesQueryKeys.firm(firmId) }); navigate(`/billing-adjustments/${created.id}`); onClose(); } });
  function submit(event: FormEvent) { event.preventDefault(); save.mutate({ sourceInvoiceId: source.id, kind, reason, idempotencyKey: key, gstReductionEligible: gstEligible, recipientItcReversalConfirmed: itcReversed, annualReturnFiledAt: annualReturn || null, lines: lines.filter((line) => line.included).map(({ sourceLineNumber, quantity, unitRate }) => ({ sourceLineNumber, quantity, unitRate })), customFieldValues: {} }); }
  return <Dialog open onClose={onClose} fullWidth maxWidth="md"><Stack component="form" onSubmit={submit}><DialogTitle>Create adjustment against {source.documentNumber}</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}>{save.isError ? <Alert severity="error">{toApiError(save.error).message}</Alert> : null}<TextField label="Document type" select value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}><MenuItem value="CREDIT_NOTE">Credit note</MenuItem><MenuItem value="DEBIT_NOTE">Debit note</MenuItem></TextField><TextField label="Reason" required multiline value={reason} inputProps={{ minLength: 5, maxLength: 2000 }} onChange={(event) => setReason(event.target.value)} /><Typography>Select source lines and enter the adjustment quantities and rates. Original tax rates and references are preserved.</Typography>
    {lines.map((line, index) => <Stack key={line.sourceLineNumber} direction={{ xs: 'column', sm: 'row' }} spacing={2}><FormControlLabel control={<Checkbox checked={line.included} onChange={(event) => setLines(lines.map((value, i) => i === index ? { ...value, included: event.target.checked } : value))} />} label={`${line.sourceLineNumber}. ${source.lines[index].itemName}`} /><TextField label="Adjustment quantity" disabled={!line.included} value={line.quantity} onChange={(event) => setLines(lines.map((value, i) => i === index ? { ...value, quantity: event.target.value } : value))} /><TextField label="Adjustment unit rate" disabled={!line.included} value={line.unitRate} onChange={(event) => setLines(lines.map((value, i) => i === index ? { ...value, unitRate: event.target.value } : value))} /></Stack>)}
    {kind === 'CREDIT_NOTE' && source.financialPolicySnapshot.registration === 'REGULAR' ? <><FormControlLabel control={<Checkbox checked={gstEligible} onChange={(event) => setGstEligible(event.target.checked)} />} label="I confirm this credit qualifies for GST reduction and the statutory reporting deadline has not passed." /><FormControlLabel control={<Checkbox checked={itcReversed} onChange={(event) => setItcReversed(event.target.checked)} />} label="Recipient has reversed the attributable ITC, if availed, or no such ITC was availed." /><TextField type="date" InputLabelProps={{ shrink: true }} label="Source financial year's annual return filed on (leave empty if not filed)" value={annualReturn} onChange={(event) => setAnnualReturn(event.target.value)} /></> : null}</Stack></DialogContent><DialogActions><AppButton onClick={onClose}>Cancel</AppButton><AppButton type="submit" variant="contained" disabled={!lines.some((line) => line.included)} isLoading={save.isPending}>Create adjustment draft</AppButton></DialogActions></Stack></Dialog>;
}
