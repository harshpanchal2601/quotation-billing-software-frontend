import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { toApiError } from '@shared/api/apiClient';
import { AppButton } from '@shared/ui/actions';
import { getBillingAddresses, getBillingCustomers, getBillingItems, previewBillingDraft } from '../api/invoices.api';
import type { BillingScope, InvoiceDocument, InvoiceDraft, InvoiceLine, SettingsResponse } from '../model/invoices.types';
import { useBillingFirmId } from '../model/invoices.query-keys';
import { CustomFieldsForm } from './CustomFieldsForm';

const emptyLine = (): InvoiceLine => ({ itemId: null, itemName: '', description: '', hsnCode: null, supplyType: 'GOODS', measurementUnit: 'NOS', quantity: '1', unitRate: '0.00', discountType: 'NONE', discountValue: '0', taxRate: '0' });
function initialDraft(settings: SettingsResponse, document?: InvoiceDocument): InvoiceDraft {
  if (document) return {
    companyId: document.companyId, billingAddressId: document.buyerSnapshot.billingAddress.id ?? 0, shippingAddressId: document.buyerSnapshot.shippingAddress?.id ?? null,
    invoiceDate: document.invoiceDate, dueDate: document.dueDate, customerReference: document.customerReference, paymentTerms: document.paymentTerms, notes: document.notes,
    supply: document.supplySnapshot, customFieldValues: document.customFieldValues,
    lines: document.lines.map((line) => ({ itemId: line.itemId, itemName: line.itemName, description: line.description, hsnCode: line.hsnCode, supplyType: line.supplyType, measurementUnit: line.measurementUnit, quantity: line.quantity, unitRate: line.unitRate, discountType: line.discountType, discountValue: line.discountValue, taxRate: line.taxRate })),
  };
  return { companyId: 0, billingAddressId: 0, shippingAddressId: null, invoiceDate: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date()), dueDate: null, customerReference: '', paymentTerms: settings.config.paymentInstructions, notes: '', supply: { isExempt: settings.config.registration !== 'REGULAR', placeOfSupplyStateCode: '', placeOfSupplyBasis: 'GOODS_MOVEMENT', explanation: '' }, customFieldValues: {}, lines: [emptyLine()] };
}
export function InvoiceDraftForm({ scope, settings, document, onSave, pending, error }: { scope: BillingScope; settings: SettingsResponse; document?: InvoiceDocument; onSave: (input: InvoiceDraft, idempotencyKey: string) => void; pending: boolean; error?: unknown }) {
  const firmId = useBillingFirmId();
  const [form, setForm] = useState(() => initialDraft(settings, document));
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [customerSearch, setCustomerSearch] = useState('');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [selectedLine, setSelectedLine] = useState(0);
  const customers = useQuery({ queryKey: ['billing', firmId, scope, 'customers', customerSearch], queryFn: ({ signal }) => getBillingCustomers(scope, customerSearch, signal) });
  const addresses = useQuery({ queryKey: ['billing', firmId, scope, 'addresses', form.companyId], queryFn: ({ signal }) => getBillingAddresses(scope, form.companyId, signal), enabled: form.companyId > 0 });
  const catalog = useQuery({ queryKey: ['billing', firmId, scope, 'items', catalogSearch], queryFn: ({ signal }) => getBillingItems(scope, catalogSearch, signal), enabled: catalogOpen });
  const preview = useMutation({ mutationFn: (input: InvoiceDraft) => previewBillingDraft(scope, { ...input, idempotencyKey }) });
  const fields = document?.customFieldSchema ?? settings.config.customFields;
  const configured = settings.config.registration !== 'UNCONFIGURED';
  function change(next: InvoiceDraft) { setForm(next); preview.reset(); }
  function lineChange(index: number, patch: Partial<InvoiceLine>) { change({ ...form, lines: form.lines.map((line, i) => i === index ? { ...line, ...patch } : line) }); }
  function submit(event: FormEvent) { event.preventDefault(); if (form.companyId && form.billingAddressId) onSave(form, idempotencyKey); }
  const customerOptions = customers.data ?? [];
  const currentCustomer = customerOptions.find((customer) => customer.id === form.companyId) ?? (document && document.companyId === form.companyId ? { id: document.companyId, name: document.buyerSnapshot.name, gstin: document.buyerSnapshot.gstin } : null);
  return <Stack component="form" onSubmit={submit} spacing={3}>
    {!configured ? <Alert severity="warning">A firm admin must configure billing registration and seller state before creating a draft.</Alert> : null}
    <Alert severity="info">Domestic forward-charge supplies are supported. Confirm the place of supply for the transaction. Use separate documents for exempt supplies.</Alert>
    {error ? <Alert severity="error">{toApiError(error).message}</Alert> : null}
    {customers.isError ? <Alert severity="error">{toApiError(customers.error).message}</Alert> : null}
    <Autocomplete options={currentCustomer && !customerOptions.some((customer) => customer.id === currentCustomer.id) ? [currentCustomer, ...customerOptions] : customerOptions} value={currentCustomer} filterOptions={(options) => options} getOptionLabel={(option) => option.name} isOptionEqualToValue={(a, b) => a.id === b.id} onInputChange={(_, value) => setCustomerSearch(value)} onChange={(_, customer) => change({ ...form, companyId: customer?.id ?? 0, billingAddressId: 0, shippingAddressId: null })} renderInput={(params) => <TextField {...params} label="Customer" required />} />
    {addresses.isError ? <Alert severity="error">{toApiError(addresses.error).message}</Alert> : null}
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
      <TextField select required fullWidth label="Billing address" value={form.billingAddressId || ''} onChange={(event) => change({ ...form, billingAddressId: Number(event.target.value) })}>{(addresses.data ?? []).map((address) => <MenuItem key={address.id} value={address.id}>{address.addressLine1}, {address.city}, {address.state}</MenuItem>)}</TextField>
      <TextField select fullWidth label="Delivery address" value={form.shippingAddressId ?? ''} onChange={(event) => change({ ...form, shippingAddressId: event.target.value ? Number(event.target.value) : null })}><MenuItem value="">Same as billing</MenuItem>{(addresses.data ?? []).map((address) => <MenuItem key={address.id} value={address.id}>{address.addressLine1}, {address.city}, {address.state}</MenuItem>)}</TextField>
    </Stack>
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
      <TextField fullWidth required type="date" label="Draft document date" InputLabelProps={{ shrink: true }} value={form.invoiceDate} onChange={(event) => change({ ...form, invoiceDate: event.target.value })} helperText="Issue date is assigned by the server when issued." />
      <TextField fullWidth type="date" label="Due date" InputLabelProps={{ shrink: true }} value={form.dueDate ?? ''} onChange={(event) => change({ ...form, dueDate: event.target.value || null })} />
      <TextField fullWidth label="Customer reference" value={form.customerReference ?? ''} inputProps={{ maxLength: 191 }} onChange={(event) => change({ ...form, customerReference: event.target.value })} />
    </Stack>
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
      <TextField fullWidth select required label="Place of supply state" value={form.supply.placeOfSupplyStateCode} onChange={(event) => change({ ...form, supply: { ...form.supply, placeOfSupplyStateCode: event.target.value } })}>{Object.entries(settings.states).map(([code, name]) => <MenuItem key={code} value={code}>{code} — {name}</MenuItem>)}</TextField>
      <TextField fullWidth select label="Place of supply basis" value={form.supply.placeOfSupplyBasis} onChange={(event) => change({ ...form, supply: { ...form.supply, placeOfSupplyBasis: event.target.value as InvoiceDraft['supply']['placeOfSupplyBasis'] } })}>{[['GOODS_MOVEMENT', 'Goods: delivery location'], ['BILL_TO_SHIP_TO', 'Goods: bill-to / ship-to rule'], ['SERVICES_GENERAL', 'Services: general rule'], ['MANUALLY_CONFIRMED', 'Other domestic rule, confirmed']].map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}</TextField>
    </Stack>
    {form.supply.placeOfSupplyBasis === 'MANUALLY_CONFIRMED' ? <TextField label="Place of supply explanation" required value={form.supply.explanation} onChange={(event) => change({ ...form, supply: { ...form.supply, explanation: event.target.value } })} /> : null}
    {settings.config.registration === 'REGULAR' ? <FormControlLabel control={<Checkbox checked={form.supply.isExempt} onChange={(event) => change({ ...form, supply: { ...form.supply, isExempt: event.target.checked }, lines: form.lines.map((line) => ({ ...line, taxRate: '0' })) })} />} label="Exempt supply — bill of supply, no GST collected" /> : null}
    <Typography variant="h6">Goods and services</Typography>
    {form.lines.map((line, index) => <Paper variant="outlined" key={index} sx={{ p: 2 }}><Stack spacing={2}>
      <Stack direction="row" spacing={2} alignItems="center"><Typography fontWeight={700}>Line {index + 1}</Typography><AppButton onClick={() => { setSelectedLine(index); setCatalogOpen(true); }}>Choose catalog item</AppButton><AppButton color="error" disabled={form.lines.length === 1} onClick={() => change({ ...form, lines: form.lines.filter((_, i) => i !== index) })}>Remove</AppButton></Stack>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField fullWidth label="Description / name" required value={line.itemName ?? ''} inputProps={{ maxLength: 191 }} onChange={(event) => lineChange(index, { itemName: event.target.value })} />
        <TextField select label="Supply type" value={line.supplyType} sx={{ minWidth: 140 }} onChange={(event) => lineChange(index, { supplyType: event.target.value as InvoiceLine['supplyType'] })}><MenuItem value="GOODS">Goods</MenuItem><MenuItem value="SERVICE">Service</MenuItem></TextField>
        <TextField label="HSN / SAC" value={line.hsnCode ?? ''} inputProps={{ maxLength: 8, pattern: '[0-9]{4}([0-9]{2})?([0-9]{2})?' }} onChange={(event) => lineChange(index, { hsnCode: event.target.value || null })} />
      </Stack>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField label="Quantity" required value={line.quantity} inputProps={{ inputMode: 'decimal', pattern: '[0-9]+(\\.[0-9]{1,3})?' }} onChange={(event) => lineChange(index, { quantity: event.target.value })} />
        <TextField label="Unit" required value={line.measurementUnit} onChange={(event) => lineChange(index, { measurementUnit: event.target.value })} disabled={Boolean(line.itemId)} />
        <TextField label="Unit rate" required value={line.unitRate} inputProps={{ inputMode: 'decimal', pattern: '[0-9]+(\\.[0-9]{1,3})?' }} onChange={(event) => lineChange(index, { unitRate: event.target.value })} />
        <TextField label="GST rate %" required value={line.taxRate} disabled={form.supply.isExempt || settings.config.registration !== 'REGULAR'} inputProps={{ inputMode: 'decimal', pattern: '[0-9]+(\\.[0-9]{1,2})?' }} onChange={(event) => lineChange(index, { taxRate: event.target.value })} />
        <TextField select label="Discount" value={line.discountType} sx={{ minWidth: 140 }} onChange={(event) => lineChange(index, { discountType: event.target.value as InvoiceLine['discountType'], discountValue: '0' })}><MenuItem value="NONE">None</MenuItem><MenuItem value="PERCENTAGE">Percentage</MenuItem><MenuItem value="FIXED">Fixed amount</MenuItem></TextField>
        {line.discountType !== 'NONE' ? <TextField label="Discount value" required value={line.discountValue} onChange={(event) => lineChange(index, { discountValue: event.target.value })} /> : null}
      </Stack>
      <TextField multiline label="Line details" value={line.description ?? ''} onChange={(event) => lineChange(index, { description: event.target.value })} />
      {line.itemId ? <AppButton onClick={() => lineChange(index, { itemId: null })}>Use as free-text line</AppButton> : null}
    </Stack></Paper>)}
    <AppButton disabled={form.lines.length >= 100} onClick={() => change({ ...form, lines: [...form.lines, emptyLine()] })}>Add line</AppButton>
    {catalogOpen ? <Paper variant="outlined" sx={{ p: 2 }}><Stack spacing={2}><Autocomplete options={catalog.data ?? []} filterOptions={(options) => options} getOptionLabel={(option) => `${option.itemCode} — ${option.name}`} onInputChange={(_, value) => setCatalogSearch(value)} onChange={(_, item) => { if (item) { lineChange(selectedLine, { itemId: item.id, itemName: item.name, unitRate: item.unitRate, taxRate: form.supply.isExempt || settings.config.registration !== 'REGULAR' ? '0' : item.taxRate, hsnCode: item.hsnCode, measurementUnit: item.measurementUnit }); setCatalogOpen(false); } }} renderInput={(params) => <TextField {...params} label="Search catalog" />} />{catalog.isError ? <Alert severity="error">{toApiError(catalog.error).message}</Alert> : null}<AppButton onClick={() => setCatalogOpen(false)}>Close catalog</AppButton></Stack></Paper> : null}
    <CustomFieldsForm fields={fields} values={form.customFieldValues} onChange={(values) => change({ ...form, customFieldValues: values })} />
    <TextField multiline minRows={2} label="Payment terms / instructions" value={form.paymentTerms ?? ''} onChange={(event) => change({ ...form, paymentTerms: event.target.value })} />
    <TextField multiline minRows={2} label="Document notes" value={form.notes ?? ''} onChange={(event) => change({ ...form, notes: event.target.value })} />
    {preview.isError ? <Alert severity="error">{toApiError(preview.error).message}</Alert> : null}
    {preview.data ? <Alert severity="info">Taxable {preview.data.currency} {preview.data.taxableAmount} · Tax {preview.data.taxAmount} · Total {preview.data.grandTotal}</Alert> : null}
    <Stack direction="row" spacing={2}><AppButton disabled={!configured || !form.companyId || !form.billingAddressId || pending} isLoading={preview.isPending} onClick={() => preview.mutate(form)}>Calculate preview</AppButton><AppButton type="submit" variant="contained" isLoading={pending} disabled={!configured || !form.companyId || !form.billingAddressId}>Save draft</AppButton></Stack>
  </Stack>;
}
