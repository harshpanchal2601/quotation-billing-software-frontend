import { Alert, Box, TextField } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PERMISSIONS, useHasPermission } from '@features/auth';
import type { SalesOrder } from '@features/sales-orders';
import { toApiError } from '@shared/api/apiClient';
import { CommandForm } from '@shared/forms/CommandForm';
import { AppButton } from '@shared/ui/actions';
import { DetailFields, DetailSection } from '@shared/ui/layout';
import { convertSalesOrderToInvoice, getBillingSettings } from '../api/invoices.api';
import { invoicesQueryKeys, useBillingFirmId } from '../model/invoices.query-keys';
import type { CustomValues, SettingsResponse, Supply } from '../model/invoices.types';
import { CustomFieldsForm } from './CustomFieldsForm';

export function InvoiceConversionSupplyFields({ idPrefix, settings, supply, onChange }: { idPrefix: string; settings?: SettingsResponse; supply: Supply; onChange: (supply: Supply) => void }) {
  return <DetailSection title="Place of supply" description="Choose the state and rule that apply to these goods or services.">
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
      <TextField id={`${idPrefix}-state`} name="placeOfSupplyStateCode" fullWidth select SelectProps={{ native: true }} InputLabelProps={{ shrink: true }} required label="Place of supply state" value={supply.placeOfSupplyStateCode} onChange={(event) => onChange({ ...supply, placeOfSupplyStateCode: event.target.value })}>
        <option value="">Choose a state</option>
        {Object.entries(settings?.states ?? {}).sort(([left], [right]) => left.localeCompare(right)).map(([code, name]) => <option key={code} value={code}>{code} — {name}</option>)}
      </TextField>
      <TextField id={`${idPrefix}-basis`} name="placeOfSupplyBasis" fullWidth select SelectProps={{ native: true }} InputLabelProps={{ shrink: true }} label="Place of supply rule" value={supply.placeOfSupplyBasis} onChange={(event) => onChange({ ...supply, placeOfSupplyBasis: event.target.value as Supply['placeOfSupplyBasis'] })}>
        <option value="GOODS_MOVEMENT">Goods delivery</option>
        <option value="BILL_TO_SHIP_TO">Bill to / ship to</option>
        <option value="SERVICES_GENERAL">General services rule</option>
        <option value="MANUALLY_CONFIRMED">Other domestic rule, confirmed</option>
      </TextField>
    </Box>
    {supply.placeOfSupplyBasis === 'MANUALLY_CONFIRMED' ? <TextField name="placeOfSupplyExplanation" label="Place of supply explanation" required multiline minRows={2} inputProps={{ maxLength: 1000 }} value={supply.explanation} onChange={(event) => onChange({ ...supply, explanation: event.target.value })} /> : null}
  </DetailSection>;
}

export function OrderInvoiceConversion({ order, onClose }: { order: SalesOrder; onClose: () => void }) {
  const firmId = useBillingFirmId();
  const cache = useQueryClient();
  const navigate = useNavigate();
  const canViewInvoices = useHasPermission(PERMISSIONS.INVOICES_VIEW);
  const formId = useId();
  const createdId = useRef<number | null>(null);
  const [values, setValues] = useState<CustomValues>({});
  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const [supply, setSupply] = useState<Supply>({ isExempt: order.snapshot.taxMode === 'NONE', placeOfSupplyStateCode: '', placeOfSupplyBasis: order.lines.length > 0 && order.lines.every((line) => line.snapshot.kind === 'SERVICE') ? 'SERVICES_GENERAL' : 'GOODS_MOVEMENT', explanation: '' });
  const settings = useQuery({ queryKey: invoicesQueryKeys.settings(firmId), queryFn: ({ signal }) => getBillingSettings(signal), enabled: firmId != null });
  const configurationMissing = settings.data != null && (settings.data.config.registration === 'UNCONFIGURED' || settings.data.config.sellerStateCode === null);
  const payload = { salesOrderId: order.id, supply, customFieldValues: values };
  const hasSelectedQuantity = order.lines.some((line) => /[1-9]/.test(quantities[line.id] ?? ''));

  return <CommandForm dialog maxWidth="md" initialOpen hideTrigger title="Invoice completed order quantities" label="Create invoice draft" successMessage="Invoice draft created." onClosed={onClose}
    isSubmitDisabled={firmId == null || !settings.data || settings.isError || configurationMissing || !hasSelectedQuantity}
    submit={async (data, idempotencyKey) => {
      const lines = order.lines.flatMap((line) => {
        const quantity = String(data.get(`quantity_${line.id}`) ?? '').trim();
        return quantity && /[1-9]/.test(quantity) ? [{ salesOrderLineId: line.id, quantity, hsnCode: String(data.get(`hsn_${line.id}`) ?? '') || null, supplyType: String(data.get(`type_${line.id}`)) as 'GOODS' | 'SERVICE' }] : [];
      });
      createdId.current = (await convertSalesOrderToInvoice({ ...payload, idempotencyKey, lines })).id;
    }}
    saved={async () => {
      if (canViewInvoices) navigate(`/invoices/${createdId.current}`);
      await Promise.all([
        cache.invalidateQueries({ queryKey: invoicesQueryKeys.firm(firmId) }, { throwOnError: true }),
        cache.invalidateQueries({ queryKey: ['sales-orders', firmId] }, { throwOnError: true }),
      ]);
    }}>
    <input type="hidden" name="conversionPayload" value={JSON.stringify(payload)} />
    <DetailFields fields={[{ label: 'Sales order', value: order.orderNumber }, { label: 'Quotation revision', value: order.snapshot.revisionNumber }]} />
    <Alert severity="info">Enter the completed quantities to include in this draft. Prices, discounts and taxes use the values agreed in the accepted quotation. These quantities are held for this invoice until it is issued or the draft is cancelled.</Alert>
    {!hasSelectedQuantity ? <Alert severity="info">Enter a quantity greater than zero for at least one completed item or service.</Alert> : null}
    {firmId == null ? <Alert severity="info">Select a firm before creating an invoice.</Alert> : null}
    {firmId != null && settings.isPending ? <Alert severity="info">Loading billing settings…</Alert> : null}
    {settings.isError ? <Alert severity="error" action={<AppButton color="inherit" size="small" onClick={() => { void settings.refetch(); }}>Retry</AppButton>}>{toApiError(settings.error).message}</Alert> : null}
    {configurationMissing ? <Alert severity="warning">Ask a firm administrator to set the billing registration and seller state before creating an invoice.</Alert> : null}
    <InvoiceConversionSupplyFields idPrefix={formId} settings={settings.data} supply={supply} onChange={setSupply} />
    {order.lines.map((line) => <DetailSection key={line.id} title={`${line.lineNumber}. ${line.snapshot.itemName}`} description={`Available to invoice: ${line.available} ${line.snapshot.measurementUnit}. Leave quantity blank to exclude this item.`}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
        <TextField name={`quantity_${line.id}`} label="Quantity to invoice" value={quantities[line.id] ?? ''} onChange={(event) => setQuantities((current) => ({ ...current, [line.id]: event.target.value }))} inputProps={{ inputMode: 'decimal', pattern: '[0-9]{1,9}(\\.[0-9]{1,3})?' }} helperText="Use up to 3 decimal places. Only completed quantities can be invoiced." />
        <TextField name={`hsn_${line.id}`} label="HSN / SAC" inputProps={{ inputMode: 'numeric', pattern: '[0-9]{4}([0-9]{2})?([0-9]{2})?' }} helperText="4, 6 or 8 digits. HSN for goods; SAC for services." />
        <TextField id={`${formId}-type-${line.id}`} name={`type_${line.id}`} fullWidth select SelectProps={{ native: true }} InputLabelProps={{ shrink: true }} label="Supply type" defaultValue={line.snapshot.kind ?? 'GOODS'}><option value="GOODS">Goods</option><option value="SERVICE">Service</option></TextField>
      </Box>
    </DetailSection>)}
    <CustomFieldsForm fields={settings.data?.config.customFields ?? []} values={values} onChange={setValues} />
  </CommandForm>;
}
