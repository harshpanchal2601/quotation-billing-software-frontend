import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PERMISSIONS, useHasPermission } from '@features/auth';
import { toApiError } from '@shared/api/apiClient';
import { CommandForm } from '@shared/forms/CommandForm';
import { AppButton } from '@shared/ui/actions';
import { DetailFields, DetailSection } from '@shared/ui/layout';
import { convertQuotationToInvoice, getBillingSettings } from '../api/invoices.api';
import { invoicesQueryKeys, useBillingFirmId } from '../model/invoices.query-keys';
import type { CustomValues, Supply } from '../model/invoices.types';
import { CustomFieldsForm } from './CustomFieldsForm';
import { InvoiceConversionSupplyFields } from './OrderInvoiceConversion';

type SourceRevision = { id: number; quotationNumber: string; revisionNumber: number; taxMode: string; items: { lineNumber: number; itemNameSnapshot: string }[] };

export function QuotationInvoiceConversion({ source, onClose }: { source: SourceRevision; onClose: () => void }) {
  const firmId = useBillingFirmId();
  const client = useQueryClient();
  const navigate = useNavigate();
  const canViewInvoices = useHasPermission(PERMISSIONS.INVOICES_VIEW);
  const formId = useId();
  const createdId = useRef<number | null>(null);
  const [values, setValues] = useState<CustomValues>({});
  const [supply, setSupply] = useState<Supply>({ isExempt: source.taxMode === 'NONE', placeOfSupplyStateCode: '', placeOfSupplyBasis: 'GOODS_MOVEMENT', explanation: '' });
  const [metadata, setMetadata] = useState(source.items.map((line) => ({ lineNumber: line.lineNumber, hsnCode: null as string | null, supplyType: 'GOODS' as 'GOODS' | 'SERVICE' })));
  const settings = useQuery({ queryKey: invoicesQueryKeys.settings(firmId), queryFn: ({ signal }) => getBillingSettings(signal), enabled: firmId != null });
  const configurationMissing = settings.data != null && (settings.data.config.registration === 'UNCONFIGURED' || settings.data.config.sellerStateCode === null);
  const payload = { sourceRevisionId: source.id, supply, customFieldValues: values, lineMetadata: metadata };

  return <CommandForm dialog maxWidth="md" initialOpen hideTrigger title="Create invoice from accepted quotation" label="Create invoice draft" successMessage="Invoice draft created." onClosed={onClose}
    isSubmitDisabled={firmId == null || !settings.data || settings.isError || configurationMissing}
    submit={async (_data, idempotencyKey) => { createdId.current = (await convertQuotationToInvoice({ ...payload, idempotencyKey })).id; }}
    saved={async () => {
      if (canViewInvoices) navigate(`/invoices/${createdId.current}`);
      await client.invalidateQueries({ queryKey: invoicesQueryKeys.firm(firmId) }, { throwOnError: true });
    }}>
    <input type="hidden" name="conversionPayload" value={JSON.stringify(payload)} />
    <DetailFields fields={[{ label: 'Quotation', value: source.quotationNumber }, { label: 'Quotation revision', value: source.revisionNumber }]} />
    <Alert severity="info">One full invoice draft can be created from this accepted revision. Prices, discounts and taxes are copied exactly as agreed. Add the HSN code for goods or SAC code for services below.</Alert>
    {firmId == null ? <Alert severity="info">Select a firm before creating an invoice.</Alert> : null}
    {firmId != null && settings.isPending ? <Alert severity="info">Loading billing settings…</Alert> : null}
    {settings.isError ? <Alert severity="error" action={<AppButton color="inherit" size="small" onClick={() => { void settings.refetch(); }}>Retry</AppButton>}>{toApiError(settings.error).message}</Alert> : null}
    {configurationMissing ? <Alert severity="warning">Ask a firm administrator to set the billing registration and seller state before creating an invoice.</Alert> : null}
    <InvoiceConversionSupplyFields idPrefix={formId} settings={settings.data} supply={supply} onChange={setSupply} />
    {metadata.map((line, index) => <DetailSection key={line.lineNumber} title={`${line.lineNumber}. ${source.items[index].itemNameSnapshot}`}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
        <TextField name={`hsn_${line.lineNumber}`} fullWidth required={settings.data?.config.registration !== 'UNREGISTERED'} label="HSN / SAC" value={line.hsnCode ?? ''} inputProps={{ inputMode: 'numeric', pattern: '[0-9]{4}([0-9]{2})?([0-9]{2})?' }} helperText="4, 6 or 8 digits. HSN for goods; SAC for services." onChange={(event) => setMetadata((current) => current.map((value, i) => i === index ? { ...value, hsnCode: event.target.value || null } : value))} />
        <TextField id={`${formId}-type-${line.lineNumber}`} name={`type_${line.lineNumber}`} fullWidth select SelectProps={{ native: true }} InputLabelProps={{ shrink: true }} label="Supply type" value={line.supplyType} onChange={(event) => setMetadata((current) => current.map((value, i) => i === index ? { ...value, supplyType: event.target.value as typeof line.supplyType } : value))}><option value="GOODS">Goods</option><option value="SERVICE">Service</option></TextField>
      </Box>
    </DetailSection>)}
    <CustomFieldsForm fields={settings.data?.config.customFields ?? []} values={values} onChange={setValues} />
  </CommandForm>;
}
