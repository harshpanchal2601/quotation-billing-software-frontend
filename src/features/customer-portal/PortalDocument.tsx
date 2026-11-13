import { Box, Stack } from '@mui/material';
import { formatRecordField, formatRecordStatus } from '@shared/ui/display';
import { formatExactDecimal } from '@shared/localization/presentation';
import { AmountSummary, DetailFields, DetailSection } from '@shared/ui/layout';
import { RecordTable } from '@shared/ui/tables';
import type { SharedDocument } from './portal.api';

function record(value: unknown): Record<string, unknown> { return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function text(value: unknown) { return typeof value === 'string' || typeof value === 'number' ? String(value) : ''; }
function specification(value: unknown): string { return Array.isArray(value) ? value.map(specification).join(', ') : value && typeof value === 'object' ? Object.entries(value).map(([key, entry]) => `${key}: ${specification(entry)}`).join('; ') : text(value); }
function address(value: unknown) { const row = record(value); return ['addressLine1', 'addressLine2', 'city', 'state', 'postalCode', 'country'].map((key) => text(row[key])).filter(Boolean).join(', '); }
export function PortalDocument({ document }: { document: SharedDocument }) {
  const snapshot = document.snapshot; const buyer = record(snapshot.buyer); const seller = record(snapshot.seller);
  const items: Array<Record<string, unknown> & { rowIndex: number }> = Array.isArray(snapshot.items) ? snapshot.items.map((line, index) => ({ ...record(line), rowIndex: index })) : [];
  const currency = text(snapshot.currency);
  const currencyDigits = /^[A-Z]{3}$/.test(currency) ? new Intl.NumberFormat('en-IN', { style: 'currency', currency }).resolvedOptions().minimumFractionDigits : 2;
  const amount = (value: unknown) => formatExactDecimal(text(value), 'en-IN', currencyDigits);
  const terms = (['deliveryTerms', 'dispatchTerms', 'paymentTerms', 'taxTerms', 'freightTerms', 'warrantyTerms', 'termsAndConditions', 'remarks'] as const).filter((key) => snapshot[key]);
  const bankFields = Object.entries(record(snapshot.bank)).filter(([, value]) => text(value));
  return <Stack spacing={2}>
    <DetailSection title={text(snapshot.orderNumber ?? snapshot.documentNumber ?? snapshot.quotationNumber)}><DetailFields fields={[
      ...(snapshot.revisionNumber !== undefined ? [{ label: 'Quotation revision', value: text(snapshot.revisionNumber) }] : []),
      ...(snapshot.status ? [{ label: 'Status', value: formatRecordStatus(text(snapshot.status)) }] : []),
      ...(snapshot.validUntil ? [{ label: 'Valid until', value: text(snapshot.validUntil).slice(0, 10) }] : []),
      ...(snapshot.invoiceDate ? [{ label: 'Invoice date', value: text(snapshot.invoiceDate).slice(0, 10) }, { label: 'Due date', value: text(snapshot.dueDate).slice(0, 10) || 'Not set' }] : []),
    ]} /></DetailSection>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
      <DetailSection title="Supplier details"><DetailFields columns={1} fields={[
        { label: 'Name', value: text(seller.legalName ?? seller.displayName) || '—' }, { label: 'Address', value: address(seller) || '—' },
        ...(seller.gstin ? [{ label: 'GSTIN', value: text(seller.gstin) }] : []),
      ]} /></DetailSection>
      <DetailSection title="Customer details"><DetailFields columns={1} fields={[
        { label: 'Name', value: text(snapshot.companyName ?? buyer.legalName ?? buyer.name) },
        { label: 'Billing address', value: address(snapshot.billingAddress ?? buyer.billingAddress) || '—' },
        ...(snapshot.gstin || buyer.gstin ? [{ label: 'GSTIN', value: text(snapshot.gstin ?? buyer.gstin) }] : []),
      ]} /></DetailSection>
    </Box>
    <DetailSection title="Items and services" description={`All amounts in ${currency}.`}><RecordTable rows={items} label="Shared document lines" rowKey={(line) => line.rowIndex} columns={[
      { key: 'item', label: 'Item / service', sortValue: (line) => text(line.itemName), render: (line) => text(line.itemName) },
      { key: 'description', label: 'Description', render: (line) => text(line.description) || '—' },
      { key: 'quantity', label: 'Quantity', align: 'right', sortValue: (line) => text(line.quantity), render: (line) => `${text(line.quantity)} ${text(line.measurementUnit)}` },
      { key: 'price', label: 'Unit price', align: 'right', sortValue: (line) => text(line.unitRate), render: (line) => amount(line.unitRate) },
      { key: 'discount', label: 'Discount', align: 'right', sortValue: (line) => text(line.discountAmount), render: (line) => amount(line.discountAmount) || '—' },
      { key: 'tax', label: 'Tax', align: 'right', sortValue: (line) => text(line.taxAmount), render: (line) => amount(line.taxAmount) || '—' },
      { key: 'total', label: 'Total', align: 'right', sortValue: (line) => text(line.lineTotal), render: (line) => amount(line.lineTotal) },
    ]} /></DetailSection>
    <Box sx={{ width: { xs: '100%', md: '50%' }, alignSelf: 'flex-end' }}><DetailSection title="Amount summary"><AmountSummary rows={[
      ...([{ key: 'subtotal', label: 'Subtotal' }, { key: 'discountAmount', label: 'Discount' }, { key: 'taxableAmount', label: 'Taxable amount' }, { key: 'taxAmount', label: 'Tax' }]).filter(({ key }) => snapshot[key] !== undefined && snapshot[key] !== null).map(({ key, label }) => ({ label, value: `${currency} ${amount(snapshot[key])}` })),
      ...(snapshot.roundOffAmount !== undefined || snapshot.roundOff !== undefined ? [{ label: 'Rounding adjustment', value: `${currency} ${amount(snapshot.roundOffAmount ?? snapshot.roundOff)}` }] : []),
      { label: 'Total', value: `${currency} ${amount(snapshot.grandTotal)}`, emphasis: true },
    ]} /></DetailSection></Box>
    {bankFields.length ? <DetailSection title="Bank details"><DetailFields fields={bankFields.map(([key, value]) => ({ label: formatRecordField(key), value: text(value) }))} /></DetailSection> : null}
    {items.some((line) => line.specifications) ? <DetailSection title="Specifications">{items.filter((line) => line.specifications).map((line) => <DetailFields key={line.rowIndex} columns={1} fields={[{ label: text(line.itemName), value: specification(line.specifications) }]} />)}</DetailSection> : null}
    {terms.length ? <DetailSection title="Terms and remarks"><DetailFields columns={1} fields={terms.map((key) => ({ label: formatRecordField(key), value: text(snapshot[key]) }))} /></DetailSection> : null}
    {document.evidence ? <DetailSection title="Quotation decision"><DetailFields fields={[
      { label: 'Decision', value: formatRecordStatus(document.evidence.decision) }, { label: 'Revision', value: document.evidence.revisionNumber },
      { label: 'Recorded at', value: new Date(document.evidence.createdAt).toLocaleString() },
    ]} /></DetailSection> : null}
  </Stack>;
}
