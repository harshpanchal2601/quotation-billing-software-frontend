import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import type { CalculatedQuotationTotals, DiscountType, TaxMode } from '../quotations.types';
import { formatCurrency, formatDiscountTypeLabel, formatTaxModeLabel } from '../quotations.utils';

type QuotationTotalsSummaryProps = {
  totals: CalculatedQuotationTotals | null;
  currency?: string;
  taxMode?: TaxMode;
  quotationDiscountType?: DiscountType;
  isCalculating?: boolean;
  state?: 'empty' | 'calculating' | 'ready' | 'invalid' | 'error';
  message?: string | null;
};

export function QuotationTotalsSummary({
  totals,
  currency = 'INR',
  taxMode = 'CGST_SGST',
  isCalculating = false,
  state,
  message,
}: QuotationTotalsSummaryProps) {
  const summaryState = state ?? (totals ? 'ready' : isCalculating ? 'calculating' : 'empty');

  if (!totals) {
    return (
      <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: 'background.paper', p: 2 }}>
        <Typography
          variant="body2"
          color={summaryState === 'error' || summaryState === 'invalid' ? 'warning.main' : 'text.secondary'}
          align="center"
          role={summaryState === 'error' ? 'alert' : 'status'}
        >
          {message || (isCalculating ? 'Calculating quotation totals...' : 'Add a valid line item to generate calculation preview.')}
        </Typography>
      </Card>
    );
  }

  const hasCgstSgst = Number(totals.cgstAmount) > 0 || Number(totals.sgstAmount) > 0 || taxMode === 'CGST_SGST';
  const hasIgst = Number(totals.igstAmount) > 0 || taxMode === 'IGST';

  return (
    <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: 'background.paper', position: 'relative' }}>
      {isCalculating ? (
        <Box
          role="status"
          aria-live="polite"
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(255, 255, 255, 0.6)',
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box textAlign="center">
            <CircularProgress size={24} aria-label="Calculating quotation totals" />
            <Typography variant="caption" color="text.secondary" display="block" mt={1}>
              Calculating...
            </Typography>
          </Box>
        </Box>
      ) : null}

      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
          Calculation Summary
        </Typography>
        {message ? (
          <Typography
            variant="caption"
            color={summaryState === 'error' ? 'warning.main' : 'text.secondary'}
            role={summaryState === 'error' ? 'alert' : 'status'}
            sx={{ display: 'block', mb: 1 }}
          >
            {message}
          </Typography>
        ) : null}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Row label="Subtotal" value={formatCurrency(totals.subtotal, currency)} />

          {Number(totals.itemDiscountAmount) > 0 ? (
            <Row
              label="Line Item Discounts"
              value={`- ${formatCurrency(totals.itemDiscountAmount, currency)}`}
              color="success.main"
            />
          ) : null}

          {Number(totals.quotationDiscountAmount) > 0 ? (
            <Row
              label={`Header Discount (${formatDiscountTypeLabel(totals.quotationDiscountType)})`}
              value={`- ${formatCurrency(totals.quotationDiscountAmount, currency)}`}
              color="success.main"
            />
          ) : null}

          <Divider sx={{ my: 0.5 }} />

          <Row label="Taxable Amount" value={formatCurrency(totals.taxableAmount, currency)} fontWeight={600} />

          {hasCgstSgst && taxMode !== 'NONE' ? (
            <>
              <Row label="CGST" value={formatCurrency(totals.cgstAmount, currency)} />
              <Row label="SGST" value={formatCurrency(totals.sgstAmount, currency)} />
            </>
          ) : null}

          {hasIgst && taxMode !== 'NONE' ? (
            <Row label="IGST" value={formatCurrency(totals.igstAmount, currency)} />
          ) : null}

          {taxMode === 'NONE' ? (
            <Row label="Tax Mode" value={formatTaxModeLabel('NONE')} color="text.secondary" />
          ) : null}

          {Number(totals.freightAmount) > 0 ? (
            <Row label="Freight Amount" value={formatCurrency(totals.freightAmount, currency)} />
          ) : null}

          {Number(totals.otherCharges) > 0 ? (
            <Row label="Other Charges" value={formatCurrency(totals.otherCharges, currency)} />
          ) : null}

          {Number(totals.roundOffAmount) !== 0 ? (
            <Row
              label="Round-off Adjustment"
              value={formatCurrency(totals.roundOffAmount, currency)}
              color="text.secondary"
            />
          ) : null}

          <Divider sx={{ my: 1 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight={700} color="primary.main">
              Grand Total
            </Typography>
            <Typography variant="h6" fontWeight={700} color="primary.main">
              {formatCurrency(totals.grandTotal, currency)}
            </Typography>
          </Box>

          {totals.amountInWords ? (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
              <strong>Amount in words:</strong> {totals.amountInWords}
            </Typography>
          ) : null}
        </Box>
      </CardContent>
    </Card>
  );
}

function Row({
  label,
  value,
  color,
  fontWeight = 400,
}: {
  label: string;
  value: string;
  color?: string;
  fontWeight?: number;
}) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" color={color || 'text.primary'} fontWeight={fontWeight}>
        {value}
      </Typography>
    </Box>
  );
}
