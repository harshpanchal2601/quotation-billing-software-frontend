import { Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import type { SharedDocument } from './portal.api';

function record(value: unknown): Record<string, unknown> { return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function text(value: unknown) { return typeof value === 'string' || typeof value === 'number' ? String(value) : ''; }
function specification(value: unknown): string { return Array.isArray(value) ? value.map(specification).join(', ') : value && typeof value === 'object' ? Object.entries(value).map(([key, entry]) => `${key}: ${specification(entry)}`).join('; ') : text(value); }
function address(value: unknown) { const row = record(value); return ['addressLine1', 'addressLine2', 'city', 'state', 'postalCode', 'country'].map((key) => text(row[key])).filter(Boolean).join(', '); }
export function PortalDocument({ document }: { document: SharedDocument }) {
  const snapshot = document.snapshot; const buyer = record(snapshot.buyer); const seller = record(snapshot.seller);
  const items = Array.isArray(snapshot.items) ? snapshot.items.map(record) : [];
  return <Stack spacing={2}>
    <Typography variant="h5">{text(snapshot.orderNumber ?? snapshot.documentNumber ?? snapshot.quotationNumber)}</Typography>
    {snapshot.revisionNumber !== undefined ? <Typography>Quotation revision {text(snapshot.revisionNumber)}</Typography> : null}
    <Typography>{text(seller.legalName ?? seller.displayName)}</Typography>{address(seller) ? <Typography>{address(seller)}</Typography> : null}
    {seller.gstin ? <Typography>Supplier GSTIN {text(seller.gstin)}</Typography> : null}
    <Typography>{text(snapshot.companyName ?? buyer.legalName ?? buyer.name)}</Typography><Typography>{address(snapshot.billingAddress ?? buyer.billingAddress)}</Typography>
    {snapshot.gstin || buyer.gstin ? <Typography>Customer GSTIN {text(snapshot.gstin ?? buyer.gstin)}</Typography> : null}
    {snapshot.validUntil ? <Typography>Valid until {text(snapshot.validUntil)}</Typography> : null}
    {snapshot.invoiceDate ? <Typography>Invoice date {text(snapshot.invoiceDate).slice(0, 10)} · Due {text(snapshot.dueDate).slice(0, 10)}</Typography> : null}
    <Stack sx={{ overflowX: 'auto' }}><Table aria-label="Shared document lines"><TableHead><TableRow>{['Item / service', 'Description', 'Quantity', 'Unit price', 'Discount', 'Tax', 'Total'].map((label) => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead><TableBody>{items.map((line, index) => <TableRow key={index}><TableCell>{text(line.itemName)}</TableCell><TableCell>{text(line.description)}</TableCell><TableCell>{text(line.quantity)} {text(line.measurementUnit)}</TableCell><TableCell>{text(line.unitRate)}</TableCell><TableCell>{text(line.discountAmount)}</TableCell><TableCell>{text(line.taxAmount)}</TableCell><TableCell>{text(line.lineTotal)}</TableCell></TableRow>)}</TableBody></Table></Stack>
    <Typography variant="h5">Total {text(snapshot.currency)} {text(snapshot.grandTotal)}</Typography>
    {Object.entries(record(snapshot.bank)).filter(([, value]) => text(value)).map(([key, value]) => <Typography key={key}>{key.replace(/([A-Z])/g, ' $1')}: {text(value)}</Typography>)}
    {items.filter((line) => line.specifications).map((line, index) => <Typography key={index}>Specifications for {text(line.itemName)}: {specification(line.specifications)}</Typography>)}
    {(['deliveryTerms', 'dispatchTerms', 'paymentTerms', 'taxTerms', 'freightTerms', 'warrantyTerms', 'termsAndConditions', 'remarks'] as const).map((key) => snapshot[key] ? <Typography key={key} sx={{ whiteSpace: 'pre-wrap' }}>{key.replace(/([A-Z])/g, ' $1')}: {text(snapshot[key])}</Typography> : null)}
    {document.evidence ? <Typography>Decision: {document.evidence.decision} · Revision {document.evidence.revisionNumber} · {new Date(document.evidence.createdAt).toLocaleString()}</Typography> : null}
  </Stack>;
}
