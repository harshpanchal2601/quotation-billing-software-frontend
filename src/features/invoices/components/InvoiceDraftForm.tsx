import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { CreateCompanyAddressAction } from '@features/companies';
import { toApiError } from '@shared/api/apiClient';
import { billingDateToday } from '@shared/dates/billingDate';
import { FormActions, FormExitGuard } from '@shared/forms';
import { useCommandIdentity } from '@shared/forms/commandIdentity';
import { AppButton } from '@shared/ui/actions';
import { getBillingAddresses, getBillingCustomers, getBillingItems, previewBillingDraft } from '../api/invoices.api';
import type { Address, BillingScope, CustomerOption, InvoiceDocument, InvoiceDraft, InvoiceLine, SettingsResponse } from '../model/invoices.types';
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
  return { companyId: 0, billingAddressId: 0, shippingAddressId: null, invoiceDate: billingDateToday(), dueDate: null, customerReference: '', paymentTerms: settings.config.paymentInstructions, notes: '', supply: { isExempt: settings.config.registration !== 'REGULAR', placeOfSupplyStateCode: '', placeOfSupplyBasis: 'GOODS_MOVEMENT', explanation: '' }, customFieldValues: {}, lines: [emptyLine()] };
}
export function InvoiceDraftForm({ scope, settings, document, assistantDraft, onSave, onCancel, hasSaved, pending, error }: { scope: BillingScope; settings: SettingsResponse; document?: InvoiceDocument; assistantDraft?: Pick<InvoiceDraft, 'companyId' | 'lines'>; onSave: (input: InvoiceDraft, idempotencyKey: string) => void; pending: boolean; onCancel: () => void; hasSaved?: boolean; error?: unknown }) {
  const firmId = useBillingFirmId();
  const cache = useQueryClient();
  const [form, setForm] = useState(() => {
    const initial = initialDraft(settings, document);
    return !document && assistantDraft ? { ...initial, companyId: assistantDraft.companyId, lines: assistantDraft.lines.map((line) => ({ ...line, taxRate: settings.config.registration === 'REGULAR' ? line.taxRate : '0' })) } : initial;
  });
  const baseline = useRef(JSON.stringify(form));
  const command = useCommandIdentity();
  const fingerprint = JSON.stringify(form);
  const locked = useRef(false);
  useEffect(() => { if (!pending) locked.current = false; }, [pending]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [selectedLine, setSelectedLine] = useState(0);
  const customers = useQuery({ queryKey: ['billing', firmId, scope, 'customers', customerSearch], queryFn: ({ signal }) => getBillingCustomers(scope, customerSearch, signal) });
  const selectedCustomerKey = ['billing', firmId, scope, 'selected-customer', form.companyId];
  const selectedCustomer = useQuery({ queryKey: selectedCustomerKey, queryFn: ({ signal }) => getBillingCustomers(scope, '', signal, form.companyId), enabled: form.companyId > 0 });
  const addresses = useQuery({ queryKey: ['billing', firmId, scope, 'addresses', form.companyId], queryFn: ({ signal }) => getBillingAddresses(scope, form.companyId, signal), enabled: form.companyId > 0 });
  const catalog = useQuery({ queryKey: ['billing', firmId, scope, 'items', catalogSearch], queryFn: ({ signal }) => getBillingItems(scope, catalogSearch, signal), enabled: catalogOpen });
  const preview = useMutation({ mutationFn: (input: InvoiceDraft) => previewBillingDraft(scope, { ...input, idempotencyKey: crypto.randomUUID() }) });
  const fields = document?.customFieldSchema ?? settings.config.customFields;
  const configured = settings.config.registration !== 'UNCONFIGURED';
  function change(next: InvoiceDraft) { setForm(next); preview.reset(); }
  function lineChange(index: number, patch: Partial<InvoiceLine>) { change({ ...form, lines: form.lines.map((line, i) => i === index ? { ...line, ...patch } : line) }); }
  function submit(event: FormEvent) { event.preventDefault(); if (!locked.current && !pending && customerReady && form.billingAddressId) { locked.current = true; onSave(form, command.getKey(fingerprint)); } }
  const customerOptions = customers.data ?? [];
  const addressOptions = [...new Map([
    ...(document?.companyId === form.companyId ? [document.buyerSnapshot.billingAddress, document.buyerSnapshot.shippingAddress].filter((address): address is Address => address !== null && address.id !== undefined) : []),
    ...(addresses.data ?? []),
  ].map((address) => [address.id, address])).values()];
  const currentCustomer = selectedCustomer.data?.find((customer) => customer.id === form.companyId) ?? customerOptions.find((customer) => customer.id === form.companyId) ?? (document && document.companyId === form.companyId ? { id: document.companyId, name: document.buyerSnapshot.name, gstin: document.buyerSnapshot.gstin } : null);
  const customerUnavailable = form.companyId > 0 && selectedCustomer.isSuccess && !selectedCustomer.data.some((customer) => customer.id === form.companyId);
  const customerReady = currentCustomer !== null && !customerUnavailable;
  return <FormExitGuard dirty={baseline.current !== fingerprint} hasSaved={hasSaved} isSubmitting={pending} onCancel={onCancel}>{(requestCancel) => <Stack component="form" onSubmit={submit} spacing={3}>
    {!configured ? <Alert severity="warning">A firm admin must configure billing registration and seller state before creating a draft.</Alert> : null}
    <Alert severity="info">Domestic forward-charge supplies are supported. Confirm the place of supply for the transaction. Use separate documents for exempt supplies.</Alert>
    {error ? <Alert severity="error">{toApiError(error).message}</Alert> : null}
    {customers.isError ? <Alert severity="error">{toApiError(customers.error).message}</Alert> : null}
    <Stack component="fieldset" disabled={pending} spacing={3} sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}>
    <Autocomplete options={currentCustomer && !customerOptions.some((customer) => customer.id === currentCustomer.id) ? [currentCustomer, ...customerOptions] : customerOptions} value={currentCustomer} filterOptions={(options) => options} getOptionLabel={(option) => option.name} isOptionEqualToValue={(a, b) => a.id === b.id} loading={customers.isFetching} onInputChange={(_, value, reason) => { if (reason === 'input' || reason === 'clear') setCustomerSearch(value); }} onChange={(_, customer) => {
      if (customer) cache.setQueryData<CustomerOption[]>(['billing', firmId, scope, 'selected-customer', customer.id], [customer]);
      change({ ...form, companyId: customer?.id ?? 0, billingAddressId: 0, shippingAddressId: null });
    }} renderInput={(params) => <TextField {...params} label="Customer" required />} />
    {form.companyId > 0 && selectedCustomer.isPending && !currentCustomer ? <Typography role="status">Loading selected customer…</Typography> : null}
    {form.companyId > 0 && selectedCustomer.isError ? <Alert severity="error" action={<AppButton onClick={() => void selectedCustomer.refetch()}>Retry selected customer</AppButton>}>Could not load the selected customer. {toApiError(selectedCustomer.error).message}</Alert> : null}
    {customerUnavailable ? <Alert severity="warning">The selected customer is unavailable. Choose an active customer before saving this draft.</Alert> : null}
    {addresses.isError ? <Alert severity="error" action={<AppButton onClick={() => void addresses.refetch()}>Retry addresses</AppButton>}>{toApiError(addresses.error).message}</Alert> : null}
    {form.companyId > 0 && addresses.isPending ? <Typography role="status">Loading customer addresses…</Typography> : null}
    {form.companyId > 0 && addresses.isSuccess && addressOptions.length === 0 ? <Alert severity="info">This customer has no saved addresses. A user with company management access must add one before this draft can be saved.</Alert> : null}
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
      <CreateCompanyAddressAction key={form.companyId} companyId={form.companyId} disabled={pending} onCreated={(address) => { cache.setQueryData<Address[]>(['billing', firmId, scope, 'addresses', form.companyId], (current) => [...(current ?? []).filter((row) => row.id !== address.id), address]); change({ ...form, billingAddressId: address.id }); }} />
      {form.companyId > 0 ? <AppButton disabled={addresses.isFetching || pending} onClick={() => void addresses.refetch()}>Refresh customer addresses</AppButton> : null}
    </Stack>
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
      <TextField select required fullWidth label="Billing address" disabled={!form.companyId || addresses.isPending || addressOptions.length === 0} helperText={!form.companyId ? 'Select a customer first.' : addressOptions.length === 0 ? 'Add an address to continue.' : undefined} value={form.billingAddressId || ''} onChange={(event) => change({ ...form, billingAddressId: Number(event.target.value) })}>{addressOptions.map((address) => <MenuItem key={address.id} value={address.id}>{address.addressLine1}, {address.city}, {address.state}</MenuItem>)}</TextField>
      <TextField select fullWidth label="Delivery address" value={form.shippingAddressId ?? ''} onChange={(event) => change({ ...form, shippingAddressId: event.target.value ? Number(event.target.value) : null })}><MenuItem value="">Same as billing</MenuItem>{addressOptions.map((address) => <MenuItem key={address.id} value={address.id}>{address.addressLine1}, {address.city}, {address.state}</MenuItem>)}</TextField>
    </Stack>
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
      <TextField fullWidth required type="date" label="Draft document date" InputLabelProps={{ shrink: true }} value={form.invoiceDate} onChange={(event) => change({ ...form, invoiceDate: event.target.value })} helperText="Issue date is assigned by the server when issued." />
      <TextField fullWidth type="date" label="Due date" InputLabelProps={{ shrink: true }} value={form.dueDate ?? ''} inputProps={{ min: form.invoiceDate }} onChange={(event) => change({ ...form, dueDate: event.target.value || null })} />
      <TextField fullWidth label="Customer reference" value={form.customerReference ?? ''} inputProps={{ maxLength: 191 }} onChange={(event) => change({ ...form, customerReference: event.target.value })} />
    </Stack>
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
      <TextField fullWidth select required label="Place of supply state" value={form.supply.placeOfSupplyStateCode} onChange={(event) => change({ ...form, supply: { ...form.supply, placeOfSupplyStateCode: event.target.value } })}>{Object.entries(settings.states).sort(([left], [right]) => left.localeCompare(right)).map(([code, name]) => <MenuItem key={code} value={code}>{code} — {name}</MenuItem>)}</TextField>
      <TextField fullWidth select label="Place of supply basis" value={form.supply.placeOfSupplyBasis} onChange={(event) => change({ ...form, supply: { ...form.supply, placeOfSupplyBasis: event.target.value as InvoiceDraft['supply']['placeOfSupplyBasis'] } })}>{[['GOODS_MOVEMENT', 'Goods: delivery location'], ['BILL_TO_SHIP_TO', 'Goods: bill-to / ship-to rule'], ['SERVICES_GENERAL', 'Services: general rule'], ['MANUALLY_CONFIRMED', 'Other domestic rule, confirmed']].map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}</TextField>
    </Stack>
    {form.supply.placeOfSupplyBasis === 'MANUALLY_CONFIRMED' ? <TextField label="Place of supply explanation" required value={form.supply.explanation} onChange={(event) => change({ ...form, supply: { ...form.supply, explanation: event.target.value } })} /> : null}
    {settings.config.registration === 'REGULAR' ? <FormControlLabel control={<Checkbox checked={form.supply.isExempt} onChange={(event) => change({ ...form, supply: { ...form.supply, isExempt: event.target.checked }, lines: form.lines.map((line) => ({ ...line, taxRate: '0' })) })} />} label="Exempt supply — bill of supply, no GST collected" /> : null}
    <Typography variant="h6">Goods and services</Typography>
    {form.lines.map((line, index) => <Paper variant="outlined" key={index} sx={{ p: 2 }}><Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}><Typography fontWeight={700}>Line {index + 1}</Typography><AppButton onClick={() => { setSelectedLine(index); setCatalogOpen(true); }}>Choose catalog item</AppButton><AppButton color="error" disabled={form.lines.length === 1} onClick={() => change({ ...form, lines: form.lines.filter((_, i) => i !== index) })}>Remove</AppButton></Stack>
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
    {catalogOpen ? <Paper variant="outlined" sx={{ p: 2 }}><Stack spacing={2}><Autocomplete options={catalog.data ?? []} filterOptions={(options) => options} getOptionLabel={(option) => `${option.itemCode} — ${option.name}`} onInputChange={(_, value) => setCatalogSearch(value)} onChange={(_, item) => { if (item) { lineChange(selectedLine, { itemId: item.id, itemName: item.name, supplyType: item.supplyType, unitRate: item.unitRate, taxRate: form.supply.isExempt || settings.config.registration !== 'REGULAR' ? '0' : item.taxRate, hsnCode: item.hsnCode, measurementUnit: item.measurementUnit }); setCatalogOpen(false); } }} renderInput={(params) => <TextField {...params} label="Search catalog" />} />{catalog.isError ? <Alert severity="error">{toApiError(catalog.error).message}</Alert> : null}<AppButton onClick={() => setCatalogOpen(false)}>Close catalog</AppButton></Stack></Paper> : null}
    <CustomFieldsForm fields={fields} values={form.customFieldValues} onChange={(values) => change({ ...form, customFieldValues: values })} />
    <TextField multiline minRows={2} label="Payment terms / instructions" value={form.paymentTerms ?? ''} onChange={(event) => change({ ...form, paymentTerms: event.target.value })} />
    <TextField multiline minRows={2} label="Document notes" value={form.notes ?? ''} onChange={(event) => change({ ...form, notes: event.target.value })} />
    {preview.isError ? <Alert severity="error">{toApiError(preview.error).message}</Alert> : null}
    {preview.data && JSON.stringify(preview.variables) === fingerprint ? <Alert severity="info">Taxable {preview.data.currency} {preview.data.taxableAmount} · Tax {preview.data.taxAmount} · Round off {preview.data.roundOffAmount} · Total {preview.data.grandTotal}</Alert> : null}
    </Stack>
    <FormActions submitLabel="Save draft" onCancel={requestCancel} isSubmitting={pending} isSubmitDisabled={!configured || !customerReady || !form.billingAddressId || Boolean(document && baseline.current === fingerprint)} secondaryAction={<AppButton disabled={!configured || !customerReady || !form.billingAddressId || pending} isLoading={preview.isPending} onClick={() => preview.mutate(form)}>Calculate preview</AppButton>} />
  </Stack>}</FormExitGuard>;
}
