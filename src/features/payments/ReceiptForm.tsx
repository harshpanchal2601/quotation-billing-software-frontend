import { Alert, Autocomplete, Checkbox, FormControlLabel, MenuItem, Stack, TextField } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { toApiError } from '@shared/api/apiClient';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { AppButton } from '@shared/ui/actions';
import { AllocationFields } from './AllocationFields';
import { getPaymentCustomers, recordPayment } from './payments.api';
import { billingDateToday, paymentCurrencies, paymentsKeys } from './payments.queries';
import type { Allocation, Payment } from './payments.types';

export function ReceiptForm({ companyId: initialCompanyId = 0, currency: initialCurrency = 'INR', onSaved }: { companyId?: number; currency?: string; onSaved: (payment: Payment) => void }) {
  const firmId = useFirmId(); const client = useQueryClient();
  const [companyId, setCompanyId] = useState(initialCompanyId); const [currency, setCurrency] = useState(initialCurrency);
  const [search, setSearch] = useState(''); const [amount, setAmount] = useState(''); const [reference, setReference] = useState('');
  const [method, setMethod] = useState<Payment['method']>('BANK_TRANSFER'); const [receivedDate, setReceivedDate] = useState(billingDateToday);
  const [allocations, setAllocations] = useState<Allocation[]>([]); const [confirmed, setConfirmed] = useState(false); const [key] = useState(() => crypto.randomUUID());
  const customers = useQuery({ queryKey: ['payments', firmId, 'customers', search], queryFn: ({ signal }) => getPaymentCustomers(search, signal), enabled: firmId != null });
  const mutation = useMutation({ mutationFn: () => recordPayment({ companyId, currency, amount, method, reference: reference.trim() || null, receivedDate, confirmed: true, idempotencyKey: key, allocations }), onSuccess: (payment) => { void client.invalidateQueries({ queryKey: paymentsKeys.firm(firmId) }); onSaved(payment); } });
  function submit(event: FormEvent) { event.preventDefault(); if (confirmed) mutation.mutate(); }
  const options = customers.data ?? []; const selected = options.find((entry) => entry.id === companyId) ?? (companyId > 0 ? { id: companyId, name: `Customer #${companyId}` } : null);
  return <Stack component="form" spacing={2} onSubmit={submit}>
    {mutation.isError ? <Alert severity="error">{toApiError(mutation.error).message}</Alert> : null}
    {customers.isError ? <Alert severity="error">{toApiError(customers.error).message}</Alert> : null}
    <Autocomplete options={selected && !options.some((entry) => entry.id === companyId) ? [selected, ...options] : options} value={selected} filterOptions={(values) => values} getOptionLabel={(entry) => entry.name} isOptionEqualToValue={(a, b) => a.id === b.id} onInputChange={(_, value) => setSearch(value)} onChange={(_, value) => { setCompanyId(value?.id ?? 0); setAllocations([]); }} renderInput={(params) => <TextField {...params} label="Receipt customer" required />} />
    <TextField label="Currency" select value={currency} onChange={(event) => { setCurrency(event.target.value); setAllocations([]); }}>{paymentCurrencies.map((code) => <MenuItem key={code} value={code}>{code}</MenuItem>)}</TextField>
    <TextField label="Receipt amount" required value={amount} onChange={(event) => setAmount(event.target.value)} inputProps={{ inputMode: 'decimal', pattern: '[0-9]+(\\.[0-9]{1,3})?' }} />
    <TextField label="Receipt method" select value={method} onChange={(event) => setMethod(event.target.value as Payment['method'])}>{[['BANK_TRANSFER', 'Bank transfer'], ['CASH', 'Cash'], ['CHEQUE', 'Cleared cheque'], ['EXTERNAL_CONFIRMED', 'Confirmed external receipt']].map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</TextField>
    <TextField label="Receipt reference" required={method !== 'CASH'} value={reference} inputProps={{ maxLength: 191 }} onChange={(event) => setReference(event.target.value)} />
    <TextField label="Received date" required type="date" InputLabelProps={{ shrink: true }} value={receivedDate} inputProps={{ max: billingDateToday() }} onChange={(event) => setReceivedDate(event.target.value)} />
    {companyId > 0 ? <AllocationFields key={`${companyId}:${currency}`} companyId={companyId} currency={currency} values={allocations} onChange={setAllocations} /> : null}
    <FormControlLabel control={<Checkbox checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />} label="I confirm these funds were received and cleared." />
    <AppButton type="submit" variant="contained" disabled={!confirmed || companyId <= 0} isLoading={mutation.isPending}>Record confirmed receipt</AppButton>
  </Stack>;
}
