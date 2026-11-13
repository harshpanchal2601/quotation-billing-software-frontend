import { Alert, Autocomplete, Checkbox, FormControlLabel, MenuItem, TextField } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { toApiError } from '@shared/api/apiClient';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { CommandForm } from '@shared/forms/CommandForm';
import { AppButton } from '@shared/ui/actions';
import { AllocationFields } from './AllocationFields';
import { getPaymentCustomers, recordPayment } from './payments.api';
import { billingDateToday, paymentCurrencies, paymentsKeys } from './payments.queries';
import type { Allocation, Payment } from './payments.types';

export function ReceiptForm({ companyId: initialCompanyId = 0, currency: initialCurrency = 'INR', onSaved, onClose }: { companyId?: number; currency?: string; onClose?: () => void; onSaved: (payment: Payment) => void }) {
  const firmId = useFirmId(); const client = useQueryClient();
  const [companyId, setCompanyId] = useState(initialCompanyId); const [currency, setCurrency] = useState(initialCurrency);
  const [search, setSearch] = useState(''); const [amount, setAmount] = useState(''); const [reference, setReference] = useState('');
  const [method, setMethod] = useState<Payment['method']>('BANK_TRANSFER'); const [receivedDate, setReceivedDate] = useState(billingDateToday);
  const [allocations, setAllocations] = useState<Allocation[]>([]); const [confirmed, setConfirmed] = useState(false); const recorded = useRef<Payment>();
  const customers = useQuery({ queryKey: ['payments', firmId, 'customers', search], queryFn: ({ signal }) => getPaymentCustomers(search, signal), enabled: firmId != null });
  const customer = useQuery({ queryKey: ['payments', firmId, 'customer', companyId], queryFn: ({ signal }) => getPaymentCustomers('', signal, companyId), enabled: firmId != null && companyId > 0 });
  const payload = { companyId, currency, amount, method, reference: reference.trim() || null, receivedDate, confirmed: true as const, allocations };
  const options = customers.data ?? []; const selected = customer.data?.find((entry) => entry.id === companyId) ?? options.find((entry) => entry.id === companyId) ?? (companyId > 0 ? { id: companyId, name: `Customer #${companyId}` } : null);
  return <CommandForm dialog maxWidth="md" initialOpen hideTrigger title="Record confirmed receipt" label="Record confirmed receipt" successMessage="Customer receipt recorded." onClosed={onClose} isSubmitDisabled={!confirmed || companyId <= 0} submit={async (_data, key) => { recorded.current = await recordPayment({ ...payload, idempotencyKey: key }); }} saved={async () => { onSaved(recorded.current!); await client.invalidateQueries({ queryKey: paymentsKeys.firm(firmId) }); }}>
    <input type="hidden" name="receiptPayload" value={JSON.stringify(payload)} />
    {customers.isError ? <Alert severity="error">{toApiError(customers.error).message}</Alert> : null}
    {customer.isError ? <Alert severity="error" action={<AppButton onClick={() => void customer.refetch()}>Retry customer</AppButton>}>{toApiError(customer.error).message}</Alert> : null}
    <Autocomplete options={selected && !options.some((entry) => entry.id === companyId) ? [selected, ...options] : options} value={selected} loading={customers.isFetching || customer.isFetching} filterOptions={(values) => values} getOptionLabel={(entry) => entry.name} isOptionEqualToValue={(a, b) => a.id === b.id} onInputChange={(_, value, reason) => { if (reason === 'input' || reason === 'clear') setSearch(value); }} onChange={(_, value) => { setCompanyId(value?.id ?? 0); setAllocations([]); }} renderInput={(params) => <TextField {...params} label="Receipt customer" required />} />
    <TextField label="Currency" select value={currency} onChange={(event) => { setCurrency(event.target.value); setAllocations([]); }}>{paymentCurrencies.map((code) => <MenuItem key={code} value={code}>{code}</MenuItem>)}</TextField>
    <TextField label="Receipt amount" required value={amount} onChange={(event) => setAmount(event.target.value)} inputProps={{ inputMode: 'decimal', pattern: '[0-9]+(\\.[0-9]{1,3})?' }} />
    <TextField label="Receipt method" select value={method} onChange={(event) => setMethod(event.target.value as Payment['method'])}>{[['BANK_TRANSFER', 'Bank transfer'], ['CASH', 'Cash'], ['CHEQUE', 'Cleared cheque'], ['EXTERNAL_CONFIRMED', 'Confirmed external receipt']].map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</TextField>
    <TextField label="Receipt reference" required={method !== 'CASH'} value={reference} inputProps={{ maxLength: 191 }} onChange={(event) => setReference(event.target.value)} />
    <TextField label="Received date" required type="date" InputLabelProps={{ shrink: true }} value={receivedDate} inputProps={{ max: billingDateToday() }} onChange={(event) => setReceivedDate(event.target.value)} />
    {companyId > 0 ? <AllocationFields key={`${companyId}:${currency}`} companyId={companyId} currency={currency} values={allocations} onChange={setAllocations} /> : null}
    <FormControlLabel control={<Checkbox checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />} label="I confirm these funds were received and cleared." />
  </CommandForm>;
}
