import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SalesOrder } from '@features/sales-orders';
import { toApiError } from '@shared/api/apiClient';
import { AppButton } from '@shared/ui/actions';
import { convertSalesOrderToInvoice, getBillingSettings } from '../api/invoices.api';
import { invoicesQueryKeys, useBillingFirmId } from '../model/invoices.query-keys';
import type { CustomValues, Supply } from '../model/invoices.types';
import { CustomFieldsForm } from './CustomFieldsForm';

export function OrderInvoiceConversion({ order, onClose }: { order: SalesOrder; onClose: () => void }) {
  const firmId = useBillingFirmId(); const cache = useQueryClient(); const navigate = useNavigate(); const [key] = useState(() => crypto.randomUUID()); const [values, setValues] = useState<CustomValues>({});
  const [supply, setSupply] = useState<Supply>({ isExempt: order.snapshot.taxMode === 'NONE', placeOfSupplyStateCode: '', placeOfSupplyBasis: 'GOODS_MOVEMENT', explanation: '' });
  const settings = useQuery({ queryKey: invoicesQueryKeys.settings(firmId), queryFn: ({ signal }) => getBillingSettings(signal) });
  const save = useMutation({ mutationFn: (lines: Array<{ salesOrderLineId: number; quantity: string; hsnCode: string | null; supplyType: 'GOODS' | 'SERVICE' }>) => convertSalesOrderToInvoice({ salesOrderId: order.id, idempotencyKey: key, supply, customFieldValues: values, lines }), onSuccess: (document) => { void cache.invalidateQueries({ queryKey: invoicesQueryKeys.firm(firmId) }); void cache.invalidateQueries({ queryKey: ['sales-orders', firmId] }); navigate(`/invoices/${document.id}`); onClose(); } });
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const lines = order.lines.flatMap((line) => { const quantity = String(data.get(`quantity_${line.id}`) ?? '').trim(); return quantity && /[1-9]/.test(quantity) ? [{ salesOrderLineId: line.id, quantity, hsnCode: String(data.get(`hsn_${line.id}`) ?? '') || null, supplyType: String(data.get(`type_${line.id}`)) as 'GOODS' | 'SERVICE' }] : []; }); save.mutate(lines); }
  return <Dialog open onClose={onClose} fullWidth maxWidth="md"><Stack component="form" onSubmit={submit}><DialogTitle>Invoice completed order quantities</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}><Typography>{order.orderNumber} · Source revision {order.snapshot.revisionNumber}</Typography>
    {save.isError || settings.isError ? <Alert severity="error">{toApiError(save.error ?? settings.error).message}</Alert> : null}
    <Typography>Enter quantities to reserve for this invoice. Prices and taxes come from the accepted order snapshot.</Typography>
    <TextField select required label="Place of supply state" value={supply.placeOfSupplyStateCode} onChange={(event) => setSupply({ ...supply, placeOfSupplyStateCode: event.target.value })}>{Object.entries(settings.data?.states ?? {}).map(([code, name]) => <MenuItem key={code} value={code}>{code} — {name}</MenuItem>)}</TextField>
    <TextField select label="Place of supply basis" value={supply.placeOfSupplyBasis} onChange={(event) => setSupply({ ...supply, placeOfSupplyBasis: event.target.value as Supply['placeOfSupplyBasis'] })}>{[['GOODS_MOVEMENT', 'Goods delivery'], ['BILL_TO_SHIP_TO', 'Bill-to / ship-to'], ['SERVICES_GENERAL', 'General services rule'], ['MANUALLY_CONFIRMED', 'Other domestic rule, confirmed']].map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</TextField>
    {supply.placeOfSupplyBasis === 'MANUALLY_CONFIRMED' ? <TextField label="Place of supply explanation" required value={supply.explanation} onChange={(event) => setSupply({ ...supply, explanation: event.target.value })} /> : null}
    {order.lines.map((line) => <Stack key={line.id} spacing={1}><TextField name={`quantity_${line.id}`} label={`${line.snapshot.itemName}: quantity`} helperText={`${line.available} completed and unreserved`} inputProps={{ inputMode: 'decimal', pattern: '\\d+(\\.\\d{1,3})?' }} /><TextField name={`hsn_${line.id}`} label="HSN / SAC" inputProps={{ pattern: '[0-9]{4}([0-9]{2})?([0-9]{2})?' }} /><TextField select name={`type_${line.id}`} label="Supply type" defaultValue="GOODS"><MenuItem value="GOODS">Goods</MenuItem><MenuItem value="SERVICE">Service</MenuItem></TextField></Stack>)}
    <CustomFieldsForm fields={settings.data?.config.customFields ?? []} values={values} onChange={setValues} />
    </Stack></DialogContent><DialogActions><AppButton onClick={onClose}>Cancel</AppButton><AppButton type="submit" variant="contained" disabled={!settings.data || save.isPending}>Create invoice draft</AppButton></DialogActions></Stack></Dialog>;
}
