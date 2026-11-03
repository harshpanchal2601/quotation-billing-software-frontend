import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toApiError } from '@shared/api/apiClient';
import { AppButton } from '@shared/ui/actions';
import { convertQuotationToInvoice, getBillingSettings } from '../api/invoices.api';
import { invoicesQueryKeys, useBillingFirmId } from '../model/invoices.query-keys';
import type { CustomValues, Supply } from '../model/invoices.types';
import { CustomFieldsForm } from './CustomFieldsForm';

type SourceRevision = { id: number; quotationNumber: string; revisionNumber: number; taxMode: string; items: { lineNumber: number; itemNameSnapshot: string }[] };
export function QuotationInvoiceConversion({ source, onClose }: { source: SourceRevision; onClose: () => void }) {
  const firmId = useBillingFirmId(); const client = useQueryClient(); const navigate = useNavigate();
  const [key] = useState(() => crypto.randomUUID()); const [values, setValues] = useState<CustomValues>({});
  const [supply, setSupply] = useState<Supply>({ isExempt: source.taxMode === 'NONE', placeOfSupplyStateCode: '', placeOfSupplyBasis: 'GOODS_MOVEMENT', explanation: '' });
  const [metadata, setMetadata] = useState(source.items.map((line) => ({ lineNumber: line.lineNumber, hsnCode: null as string | null, supplyType: 'GOODS' as 'GOODS' | 'SERVICE' })));
  const settings = useQuery({ queryKey: invoicesQueryKeys.settings(firmId), queryFn: ({ signal }) => getBillingSettings(signal) });
  const save = useMutation({ mutationFn: () => convertQuotationToInvoice({ sourceRevisionId: source.id, idempotencyKey: key, supply, customFieldValues: values, lineMetadata: metadata }), onSuccess: (document) => { void client.invalidateQueries({ queryKey: invoicesQueryKeys.firm(firmId) }); navigate(`/invoices/${document.id}`); onClose(); } });
  return <Dialog open onClose={onClose} fullWidth maxWidth="md"><Stack component="form" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}><DialogTitle>Convert accepted quotation revision</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}><Typography>{source.quotationNumber} · Exact revision {source.revisionNumber}</Typography><Alert severity="info">One full invoice draft is permitted for this revision. Accepted prices, discounts and taxes are copied exactly. HSN/SAC is entered here because quotation snapshots do not contain it.</Alert>
    {settings.isError || save.isError ? <Alert severity="error">{toApiError(settings.error ?? save.error).message}</Alert> : null}
    <TextField select required label="Place of supply state" value={supply.placeOfSupplyStateCode} onChange={(event) => setSupply({ ...supply, placeOfSupplyStateCode: event.target.value })}>{Object.entries(settings.data?.states ?? {}).map(([code, name]) => <MenuItem key={code} value={code}>{code} — {name}</MenuItem>)}</TextField>
    <TextField select label="Place of supply basis" value={supply.placeOfSupplyBasis} onChange={(event) => setSupply({ ...supply, placeOfSupplyBasis: event.target.value as Supply['placeOfSupplyBasis'] })}>{[['GOODS_MOVEMENT', 'Goods delivery'], ['BILL_TO_SHIP_TO', 'Bill-to / ship-to'], ['SERVICES_GENERAL', 'General services rule'], ['MANUALLY_CONFIRMED', 'Other domestic rule, confirmed']].map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</TextField>
    {supply.placeOfSupplyBasis === 'MANUALLY_CONFIRMED' ? <TextField required label="Place of supply explanation" value={supply.explanation} onChange={(event) => setSupply({ ...supply, explanation: event.target.value })} /> : null}
    {metadata.map((line, index) => <Stack direction="row" spacing={2} key={line.lineNumber}><TextField fullWidth required={settings.data?.config.registration !== 'UNREGISTERED'} label={`HSN / SAC: ${source.items[index].itemNameSnapshot}`} value={line.hsnCode ?? ''} inputProps={{ pattern: '[0-9]{4}([0-9]{2})?([0-9]{2})?' }} onChange={(event) => setMetadata(metadata.map((value, i) => i === index ? { ...value, hsnCode: event.target.value || null } : value))} /><TextField select label="Supply type" value={line.supplyType} sx={{ minWidth: 140 }} onChange={(event) => setMetadata(metadata.map((value, i) => i === index ? { ...value, supplyType: event.target.value as typeof line.supplyType } : value))}><MenuItem value="GOODS">Goods</MenuItem><MenuItem value="SERVICE">Service</MenuItem></TextField></Stack>)}
    <CustomFieldsForm fields={settings.data?.config.customFields ?? []} values={values} onChange={setValues} />
    </Stack></DialogContent><DialogActions><AppButton onClick={onClose}>Cancel</AppButton><AppButton type="submit" variant="contained" disabled={!settings.data || settings.data.config.registration === 'UNCONFIGURED'} isLoading={save.isPending}>Create invoice draft</AppButton></DialogActions></Stack></Dialog>;
}
