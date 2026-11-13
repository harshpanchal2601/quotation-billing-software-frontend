import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useId, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { PERMISSIONS, useHasPermission } from '@features/auth';
import { InvoiceSettlementPanel } from '@features/payments';
import { InvoiceFieldHistory } from '@features/automation';
import { downloadBlob } from '@shared/api/download';
import { CommandForm } from '@shared/forms/CommandForm';
import { getSafeListReturnPath } from '@shared/routing/returnNavigation';
import { RecordTable } from '@shared/ui/tables';
import { toApiError } from '@shared/api/apiClient';
import { ErrorState } from '@shared/components/common/ErrorState';
import { FullPageLoader } from '@shared/components/common/FullPageLoader';
import { AppButton } from '@shared/ui/actions';
import { AppStatusChip, formatRecordStatus } from '@shared/ui/display';
import { AppDialog, ConfirmDialog } from '@shared/ui/dialogs';
import { useNotification } from '@shared/ui/feedback';
import { AmountSummary, DetailActions, DetailFields, DetailHeader, DetailSection, PageContainer } from '@shared/ui/layout';
import { cancelBillingDraft, convertProformaToInvoice, createBillingAdjustment, fetchBillingPdf, generateBillingPdf, getBillingDocument, issueBillingDocument, listBillingPdfs, updateCustomValues, voidBillingDocument } from '../api/invoices.api';
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
  const notify = useNotification(); const locked = useRef(false); const dismissFailure = useRef<(() => void) | null>(null);
  const compact = useMediaQuery(useTheme().breakpoints.down('sm'));
  const location = useLocation(); const returnPath = getSafeListReturnPath(location, `/${scope}`);
  const canEdit = useHasPermission(scopePermissions[scope].edit); const canIssue = useHasPermission(scopePermissions[scope].issue); const canVoid = useHasPermission(scopePermissions[scope].void); const canDocuments = useHasPermission(scopePermissions[scope].documents);
  const canCreateInvoice = useHasPermission(PERMISSIONS.INVOICES_CREATE); const canAdjust = useHasPermission(PERMISSIONS.ADJUSTMENTS_MANAGE);
  const canRecurring = useHasPermission(PERMISSIONS.BILLING_RECURRING);
  const [customValues, setCustomValues] = useState<CustomValues>(document.customFieldValues);
  const [confirmIssue, setConfirmIssue] = useState(false); const [voidOpen, setVoidOpen] = useState(false); const [adjustOpen, setAdjustOpen] = useState(false);
  const [cancelDraftOpen, setCancelDraftOpen] = useState(false);
  const [conversionKey] = useState(() => crypto.randomUUID()); const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  useEffect(() => () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); }, [pdfUrl]);
  const documents = useQuery({ queryKey: ['billing', firmId, scope, document.id, 'pdfs'], queryFn: ({ signal }) => listBillingPdfs(scope, document.id, signal), enabled: canDocuments });
  const refresh = () => Promise.all([client.invalidateQueries({ queryKey: invoicesQueryKeys.firm(firmId) }, { throwOnError: true }), client.invalidateQueries({ queryKey: ['payments', firmId] }, { throwOnError: true }), client.invalidateQueries({ queryKey: ['sales-orders', firmId] }, { throwOnError: true })]);
  const mutation = useMutation({
    mutationFn: async (command: { run: () => Promise<unknown>; successMessage?: string; refresh: boolean }) => { await command.run(); },
    onSuccess: async (_result, command) => {
      setConfirmIssue(false); setVoidOpen(false); setCancelDraftOpen(false);
      dismissFailure.current?.(); dismissFailure.current = null;
      if (command.successMessage) notify(command.successMessage);
      if (command.refresh) {
        try { await refresh(); }
        catch { notify('The document was updated, but related records could not refresh. Reload before submitting another change.', 'warning'); }
      }
    },
    onError: (error) => {
      const failure = toApiError(error);
      if (failure.cancelled) return;
      dismissFailure.current?.();
      if (failure.approvalRequested) setConfirmIssue(false);
      dismissFailure.current = notify(failure.message, failure.approvalRequested ? 'info' : 'error');
    },
    onSettled: () => { locked.current = false; },
  });
  function execute(run: () => Promise<unknown>, successMessage?: string, refresh = true) {
    if (locked.current) return;
    locked.current = true;
    mutation.mutate({ run, successMessage, refresh });
  }
  const draft = document.status === 'DRAFT'; const sourceLocked = Boolean(document.sourceQuotationId || document.sourceProformaId || document.sourceInvoiceId || document.sourceSalesOrderId);
  async function openPdf(pdfId: number, download: boolean) {
    const blob = await fetchBillingPdf(scope, document.id, pdfId);
    if (!download) { setPdfUrl(URL.createObjectURL(blob)); return; }
    downloadBlob(blob, `${document.documentNumber?.replace(/\//g, '-') ?? document.id}.pdf`);
  }
  const address = document.buyerSnapshot.billingAddress;
  const billingAddress = address ? [address.addressLine1, address.addressLine2, address.city, address.state, address.postalCode, address.country].filter(Boolean).join(', ') : 'No billing address';
  const typeLabel = document.kind.replace(/_/g, ' ').toLowerCase();
  const additionalValuesChanged = document.customFieldSchema.some((field) => (customValues[field.key] ?? null) !== (document.customFieldValues[field.key] ?? null));
  return <PageContainer><DetailHeader title={document.documentNumber ?? `Draft #${document.id}`} description={`${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} · Version ${document.version}`} status={<AppStatusChip label={formatRecordStatus(document.status)} variant={document.status === 'ISSUED' ? 'success' : document.status === 'VOID' ? 'error' : 'neutral'} size="medium" />} backAction={<AppButton size="small" color="inherit" onClick={() => navigate(returnPath)}>Back to list</AppButton>} />
    {mutation.isError && !toApiError(mutation.error).cancelled ? <Alert severity={toApiError(mutation.error).approvalRequested ? 'info' : 'error'}>{toApiError(mutation.error).message}</Alert> : null}
    {document.kind === 'PROFORMA' ? <Alert severity="info">This is an estimate, not a tax invoice. It does not add an amount for the customer to pay.</Alert> : null}
    {document.status === 'VOID' ? <Alert severity="warning"><Typography variant="body2">{document.issuedAt ? 'Cancelled' : 'Draft cancelled'}: {document.voidReason}</Typography><Typography variant="body2">{document.issuedAt ? 'The original document and its history are kept for your records.' : document.sourceSalesOrderId ? 'Its order quantities are available to invoice again.' : 'The draft and its history are kept for your records.'}</Typography></Alert> : null}
    <DetailActions label="Document actions">
      {draft && canEdit && !sourceLocked ? <AppButton onClick={() => navigate(`/${scope}/${document.id}/edit`, { state: { from: returnPath } })}>Edit draft</AppButton> : null}
      {draft && canVoid ? <AppButton color="error" disabled={mutation.isPending} onClick={() => setCancelDraftOpen(true)}>{document.sourceSalesOrderId ? 'Cancel order invoice draft' : 'Cancel draft'}</AppButton> : null}
      {draft && document.kind === 'INVOICE' && !sourceLocked && canRecurring && canCreateInvoice ? <AppButton onClick={() => navigate(`/billing-schedules?sourceDraftId=${document.id}`)}>Create recurring schedule</AppButton> : null}
      {draft && canIssue ? <AppButton variant="contained" disabled={mutation.isPending} onClick={() => setConfirmIssue(true)}>Issue {document.kind === 'PROFORMA' ? 'proforma' : typeLabel}</AppButton> : null}
      {document.status === 'ISSUED' && canDocuments ? <AppButton variant="contained" isLoading={mutation.isPending} onClick={() => execute(() => generateBillingPdf(scope, document.id), 'PDF version generated.')}>Generate PDF version</AppButton> : null}
      {document.status === 'ISSUED' && scope === 'proformas' && canCreateInvoice ? <AppButton isLoading={mutation.isPending} onClick={() => execute(async () => { const created = await convertProformaToInvoice(document.id, conversionKey); navigate(`/invoices/${created.id}`); }, 'Invoice draft created from proforma.')}>Convert to invoice draft</AppButton> : null}
      {document.status === 'ISSUED' && scope === 'invoices' && canAdjust ? <AppButton disabled={mutation.isPending} onClick={() => setAdjustOpen(true)}>Create credit / debit note</AppButton> : null}
    
      {!draft && document.status === 'ISSUED' && canVoid && scope !== 'billing-adjustments' ? <AppButton color="error" disabled={mutation.isPending} onClick={() => setVoidOpen(true)}>Cancel {typeLabel}</AppButton> : null}
    </DetailActions>
    <DetailSection title="Document overview"><DetailFields columns={3} fields={[
      { label: 'Document date', value: document.invoiceDate }, { label: 'Due date', value: document.dueDate || 'Not specified' },
      { label: 'Customer reference', value: document.customerReference || 'Not specified' }, { label: 'Currency', value: document.currency },
      { label: 'Place of supply', value: document.placeOfSupplyStateName ? `${document.placeOfSupplyStateName} (${document.supplySnapshot.placeOfSupplyStateCode})` : document.supplySnapshot.placeOfSupplyStateCode },
      { label: 'Tax treatment', value: document.financialPolicySnapshot.taxMode === 'CGST_SGST' ? `CGST + ${document.financialPolicySnapshot.localTaxLabel}` : document.financialPolicySnapshot.taxMode === 'IGST' ? 'IGST' : 'No GST charged' },
    ]} /></DetailSection>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' }, gap: 3 }}>
      <DetailSection title="Customer"><DetailFields fields={[
        { label: 'Customer name', value: document.buyerSnapshot.legalName || document.buyerSnapshot.name },
        { label: 'GSTIN', value: document.buyerSnapshot.gstin || 'Unregistered' },
        { label: 'Billing address', value: billingAddress },
        ...(document.buyerSnapshot.shippingAddress ? [{ label: 'Delivery address', value: [document.buyerSnapshot.shippingAddress.addressLine1, document.buyerSnapshot.shippingAddress.addressLine2, document.buyerSnapshot.shippingAddress.city, document.buyerSnapshot.shippingAddress.state, document.buyerSnapshot.shippingAddress.postalCode, document.buyerSnapshot.shippingAddress.country].filter(Boolean).join(', ') }] : []),
      ]} /></DetailSection>
      <DetailSection title={document.sellerSnapshot ? 'Supplier at issue' : 'Supplier'} description={document.sellerSnapshot ? 'Saved when this document was issued.' : 'Supplier details are captured when the draft is issued.'}>
        {document.sellerSnapshot ? <DetailFields fields={[
          { label: 'Supplier name', value: document.sellerSnapshot.legalName }, { label: 'GSTIN', value: document.sellerSnapshot.gstin || 'Unregistered' },
          { label: 'State', value: document.sellerSnapshot.stateName },
        ]} /> : null}
      </DetailSection>
    </Box>
    {document.sourceSnapshot ? <Alert severity="info">Created from {document.sourceSnapshot.orderNumber || document.sourceSnapshot.quotationNumber || document.sourceSnapshot.proformaNumber || document.sourceSnapshot.invoiceNumber}{document.sourceSnapshot.revisionNumber !== undefined ? ` · Quotation revision ${document.sourceSnapshot.revisionNumber}` : ''}. Prices and taxes use the values agreed in that document.</Alert> : null}
    <DetailSection title="Line items" description={`All amounts in ${document.currency}.`}><RecordTable rows={document.lines} label="Document lines" rowKey={(line) => line.lineNumber} columns={[
      { key: 'line', label: 'Line', sortValue: (line) => line.lineNumber, render: (line) => line.lineNumber }, { key: 'item', label: 'Goods / service', sortValue: (line) => line.itemName, render: (line) => line.itemName }, { key: 'hsn', label: 'HSN / SAC', sortValue: (line) => line.hsnCode, render: (line) => line.hsnCode || 'Required before registered issuance' },
      { key: 'quantity', label: 'Quantity', sortValue: (line) => line.quantity, align: 'right', render: (line) => `${line.quantity} ${line.measurementUnit}` }, { key: 'rate', label: 'Rate', sortValue: (line) => line.unitRate, align: 'right', render: (line) => line.unitRate }, { key: 'taxable', label: 'Taxable', sortValue: (line) => line.taxableAmount, align: 'right', render: (line) => line.taxableAmount },
      { key: 'cgst', label: 'CGST', sortValue: (line) => line.cgstAmount, align: 'right', render: (line) => line.cgstAmount }, { key: 'localTax', label: document.financialPolicySnapshot.localTaxLabel, sortValue: (line) => line.sgstAmount, align: 'right', render: (line) => line.sgstAmount }, { key: 'igst', label: 'IGST', sortValue: (line) => line.igstAmount, align: 'right', render: (line) => line.igstAmount }, { key: 'total', label: 'Total', sortValue: (line) => line.lineTotal, align: 'right', render: (line) => line.lineTotal },
    ]} />
    </DetailSection>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) minmax(300px, 0.75fr)' }, gap: 3, alignItems: 'start' }}>
      <DetailSection title="Terms & notes"><DetailFields columns={1} fields={[
        { label: 'Payment terms', value: document.paymentTerms || 'Not specified' }, { label: 'Document notes', value: document.notes || 'Not specified' },
        ...(document.adjustmentReason ? [{ label: 'Adjustment reason', value: document.adjustmentReason }] : []),
      ]} /></DetailSection>
      <DetailSection title="Totals"><AmountSummary rows={[
        { label: 'Subtotal', value: `${document.currency} ${document.subtotal}` }, { label: 'Discount', value: document.discountAmount },
        { label: 'Taxable amount', value: document.taxableAmount }, { label: 'Tax', value: document.taxAmount },
        ...(document.sourceSnapshot?.extraCharges ? [{ label: document.sourceSalesOrderId ? 'Allocated source charges' : 'Freight & other charges', value: document.sourceSnapshot.extraCharges }] : []),
        { label: 'Round off', value: document.roundOffAmount }, { label: 'Total', value: `${document.currency} ${document.grandTotal}`, emphasis: true },
      ]} /></DetailSection>
    </Box>
    <DetailSection title="Additional information">
      {document.customFieldSchema.length ? <DetailFields fields={document.customFieldSchema.map((field) => {
        const value = document.customFieldValues[field.key];
        return { label: field.label, value: typeof value === 'boolean' ? value ? 'Yes' : 'No' : value || 'Not specified' };
      })} /> : <Typography color="text.secondary">No additional fields are included in this document.</Typography>}
      <DetailActions label="Additional information actions">
        {draft && canEdit && document.customFieldSchema.length > 0 ? <CommandForm dialog maxWidth="md" title="Edit additional information" label="Save additional information" successMessage="Additional information saved." isSubmitDisabled={!additionalValuesChanged || mutation.isPending} onClosed={() => setCustomValues(document.customFieldValues)} saved={refresh} submit={() => updateCustomValues(scope, document, customValues)}>
          <input type="hidden" name="additionalValues" value={JSON.stringify(customValues)} />
          <CustomFieldsForm fields={document.customFieldSchema} values={customValues} onChange={setCustomValues} />
        </CommandForm> : null}
        {draft && canEdit ? <AppButton disabled={mutation.isPending} onClick={() => navigate(`/${scope}/${document.id}/fields`)}>Review latest additional fields</AppButton> : null}
      </DetailActions>
      <InvoiceFieldHistory key={`${scope}:${document.id}:${document.version}`} scope={scope} entityId={document.id} />
    </DetailSection>
    {canDocuments ? <DetailSection title="PDF history" actions={<AppButton disabled={mutation.isPending || documents.isFetching} onClick={() => void documents.refetch()}>Refresh PDF history</AppButton>}>{documents.isError ? <Alert severity="error" action={<AppButton onClick={() => void documents.refetch()}>Retry PDFs</AppButton>}>{toApiError(documents.error).message}</Alert> : documents.isPending ? <Typography role="status">Loading PDF history…</Typography> : <RecordTable rows={documents.data ?? []} label="Billing PDF history" rowKey={(pdf) => pdf.id} emptyMessage="No PDF versions yet." columns={[
      { key: 'version', label: 'Version', sortValue: (pdf) => pdf.versionNumber, render: (pdf) => pdf.versionNumber },
      { key: 'generated', label: 'Generated', sortValue: (pdf) => new Date(pdf.generatedAt).getTime(), render: (pdf) => new Date(pdf.generatedAt).toLocaleString() },
      { key: 'size', label: 'File size', align: 'right', sortValue: (pdf) => pdf.fileSize, render: (pdf) => `${pdf.fileSize} bytes` },
      { key: 'actions', label: 'Actions', render: (pdf) => <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}><AppButton disabled={mutation.isPending} aria-label={`Preview PDF version ${pdf.versionNumber}`} onClick={() => execute(() => openPdf(pdf.id, false), undefined, false)}>Preview</AppButton><AppButton disabled={mutation.isPending} aria-label={`Download PDF version ${pdf.versionNumber}`} onClick={() => execute(() => openPdf(pdf.id, true), 'PDF download started.', false)}>Download</AppButton></Stack> },
    ]} />}</DetailSection> : null}
    {document.kind === 'INVOICE' && document.status === 'ISSUED' ? <InvoiceSettlementPanel invoiceId={document.id} /> : null}
    <DetailSection title="Status history"><RecordTable rows={document.statusHistory} label="Document status history" rowKey={(history) => history.version} columns={[
      { key: 'version', label: 'Version', sortValue: (history) => history.version, render: (history) => history.version },
      { key: 'from', label: 'From', sortValue: (history) => history.fromStatus, noWrap: true, render: (history) => history.fromStatus ? formatRecordStatus(history.fromStatus) : 'Created' },
      { key: 'to', label: 'To', sortValue: (history) => history.toStatus, noWrap: true, render: (history) => formatRecordStatus(history.toStatus) },
      { key: 'actor', label: 'Changed by', sortValue: (history) => history.changedById, render: (history) => `User #${history.changedById}` },
      { key: 'date', label: 'Date', sortValue: (history) => new Date(history.changedAt).getTime(), render: (history) => new Date(history.changedAt).toLocaleString() },
    ]} /></DetailSection>
    <ConfirmDialog open={confirmIssue} title={`Issue this ${typeLabel}?`} onClose={() => setConfirmIssue(false)} isConfirming={mutation.isPending} confirmLabel="Confirm issuance" onConfirm={() => execute(() => issueBillingDocument(scope, document), 'Document issued.')}><Typography>Confirm total {document.currency} {document.grandTotal}. A document number and issue date will be assigned. Amounts and additional fields will then be locked.</Typography></ConfirmDialog>
    {voidOpen ? <CancellationDialog document={document} scope={scope} onClose={() => setVoidOpen(false)} saved={refresh} /> : null}
    <AppDialog open={pdfUrl !== null} onClose={() => setPdfUrl(null)} title="Saved document PDF" fullWidth maxWidth="lg" fullScreen={compact} actions={<AppButton onClick={() => setPdfUrl(null)}>Close</AppButton>}>{pdfUrl ? <iframe src={pdfUrl} title="Billing PDF preview" style={{ width: '100%', height: '75vh', border: 0 }} /> : null}</AppDialog>
    {adjustOpen ? <AdjustmentDialog source={document} onClose={() => setAdjustOpen(false)} /> : null}
    {cancelDraftOpen ? <CancellationDialog document={document} scope={scope} draft onClose={() => setCancelDraftOpen(false)} saved={refresh} /> : null}
  </PageContainer>;
}
function CancellationDialog({ document, scope, draft = false, onClose, saved }: { document: InvoiceDocument; scope: BillingScope; draft?: boolean; onClose: () => void; saved: () => Promise<unknown> }) {
  const [reason, setReason] = useState(''); const [confirmed, setConfirmed] = useState(false);
  const title = draft ? document.kind === 'INVOICE' ? 'Cancel invoice draft' : document.kind === 'PROFORMA' ? 'Cancel proforma draft' : 'Cancel note draft' : `Cancel ${document.kind === 'PROFORMA' ? 'proforma invoice' : 'invoice'}`;
  return <CommandForm dialog initialOpen hideTrigger title={title} label={title} cancelLabel={draft ? 'Keep draft' : 'Keep invoice'} submitColor="error" onClosed={onClose} saved={saved} successMessage={draft ? 'Draft cancelled.' : 'Document cancelled.'} isSubmitDisabled={reason.trim().length < 5 || !draft && !confirmed}
    submit={() => draft ? document.sourceSalesOrderId ? cancelOrderInvoiceDraft(document, reason) : cancelBillingDraft(scope, document, reason) : voidBillingDocument(scope, document, reason)}>
    <input type="hidden" name="cancellation" value={JSON.stringify({ reason, confirmed })} />
    <Typography>{draft ? document.sourceSalesOrderId ? 'The draft stays in your records. Its order quantities become available to invoice again.' : 'This unissued draft will be marked cancelled and kept in your records. It will not change issued documents, payments or stock.' : 'Cancellation is allowed only on the issue date and before this document is included in GST returns. The original document and history are kept. Use a credit or debit note for later corrections.'}</Typography>
    <TextField name="reason" label="Cancellation reason" required multiline minRows={2} value={reason} inputProps={{ minLength: 5, maxLength: 2000 }} onChange={(event) => setReason(event.target.value)} />
    {!draft ? <FormControlLabel control={<Checkbox name="confirmed" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />} label="The sale is cancelled, and this document has not been included in GST returns." /> : null}
  </CommandForm>;
}
function AdjustmentDialog({ source, onClose }: { source: InvoiceDocument; onClose: () => void }) {
  const navigate = useNavigate(); const client = useQueryClient(); const firmId = useBillingFirmId();
  const typeId = useId();
  const [kind, setKind] = useState<'CREDIT_NOTE' | 'DEBIT_NOTE'>('CREDIT_NOTE'); const [reason, setReason] = useState('');
  const createdId = useRef<number | null>(null);
  const [gstEligible, setGstEligible] = useState(false); const [itcReversed, setItcReversed] = useState(false); const [annualReturn, setAnnualReturn] = useState('');
  const [lines, setLines] = useState(source.lines.map((line) => ({ included: false, sourceLineNumber: line.lineNumber, quantity: '1', unitRate: line.unitRate })));
  const payload: Omit<AdjustmentDraft, 'idempotencyKey'> = { sourceInvoiceId: source.id, kind, reason, gstReductionEligible: gstEligible, recipientItcReversalConfirmed: itcReversed, annualReturnFiledAt: annualReturn || null, lines: lines.filter((line) => line.included).map(({ sourceLineNumber, quantity, unitRate }) => ({ sourceLineNumber, quantity, unitRate })), customFieldValues: {} };
  return <CommandForm dialog initialOpen hideTrigger title={`Create adjustment against ${source.documentNumber}`} label="Create adjustment draft" successMessage="Adjustment draft created." onClosed={onClose} isSubmitDisabled={!payload.lines.length}
    submit={async (_data, idempotencyKey) => { createdId.current = (await createBillingAdjustment({ ...payload, idempotencyKey })).id; }}
    saved={async () => { navigate(`/billing-adjustments/${createdId.current}`); await client.invalidateQueries({ queryKey: invoicesQueryKeys.firm(firmId) }, { throwOnError: true }); }}>
    <input type="hidden" name="adjustmentPayload" value={JSON.stringify(payload)} />
    <TextField id={typeId} name="kind" label="Document type" select SelectProps={{ native: true }} InputLabelProps={{ shrink: true }} value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}><option value="CREDIT_NOTE">Credit note</option><option value="DEBIT_NOTE">Debit note</option></TextField>
    <TextField name="reason" label="Reason" required multiline minRows={2} value={reason} inputProps={{ minLength: 5, maxLength: 2000 }} onChange={(event) => setReason(event.target.value)} />
    <Typography>Select source lines and enter the adjustment quantities and rates. Original tax rates and references are preserved. This creates a draft; the adjustment takes effect when issued.</Typography>
    {lines.map((line, index) => <Box key={line.sourceLineNumber} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 2 }}>
      <FormControlLabel sx={{ alignItems: 'flex-start', m: 0, mb: 2, '& .MuiFormControlLabel-label': { pt: 1, overflowWrap: 'anywhere' } }} control={<Checkbox name={`include_${line.sourceLineNumber}`} checked={line.included} onChange={(event) => setLines(lines.map((value, i) => i === index ? { ...value, included: event.target.checked } : value))} />} label={`${line.sourceLineNumber}. ${source.lines[index].itemName}`} />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
        <TextField name={`quantity_${line.sourceLineNumber}`} label="Adjustment quantity" required disabled={!line.included} value={line.quantity} inputProps={{ inputMode: 'decimal' }} onChange={(event) => setLines(lines.map((value, i) => i === index ? { ...value, quantity: event.target.value } : value))} />
        <TextField name={`unitRate_${line.sourceLineNumber}`} label="Adjustment unit rate" required disabled={!line.included} value={line.unitRate} inputProps={{ inputMode: 'decimal' }} onChange={(event) => setLines(lines.map((value, i) => i === index ? { ...value, unitRate: event.target.value } : value))} />
      </Box>
    </Box>)}
    {kind === 'CREDIT_NOTE' && source.financialPolicySnapshot.registration === 'REGULAR' ? <>
      <FormControlLabel control={<Checkbox name="gstEligible" checked={gstEligible} onChange={(event) => setGstEligible(event.target.checked)} />} label="I confirm this credit qualifies for GST reduction and the statutory reporting deadline has not passed." />
      <FormControlLabel control={<Checkbox name="itcReversed" checked={itcReversed} onChange={(event) => setItcReversed(event.target.checked)} />} label="Recipient has reversed the attributable ITC, if availed, or no such ITC was availed." />
      <TextField name="annualReturn" type="date" InputLabelProps={{ shrink: true }} label="Annual return filing date" helperText="Source financial year's annual return. Leave empty if not filed." value={annualReturn} onChange={(event) => setAnnualReturn(event.target.value)} />
    </> : null}
  </CommandForm>;
}
