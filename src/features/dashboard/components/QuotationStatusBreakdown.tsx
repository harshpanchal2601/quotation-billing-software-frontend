import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { QuotationStatusChip } from '../../quotations/components/QuotationStatusChip';
import { formatCurrency } from '../../quotations/quotations.utils';
import type { StatusBreakdownDto } from '../dashboard.types';

type QuotationStatusBreakdownProps = {
  statusBreakdown: StatusBreakdownDto[];
  currency?: string;
};

export function QuotationStatusBreakdown({ statusBreakdown, currency = 'INR' }: QuotationStatusBreakdownProps) {
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ p: 2.5, flexGrow: 1 }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
          Quotation Status Breakdown
        </Typography>

        <Stack spacing={2}>
          {statusBreakdown.map((item) => {
            const pct = Number(item.percentageOfCount) || 0;
            return (
              <Box key={item.status}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <QuotationStatusChip status={item.status} size="small" />
                    <Typography variant="body2" color="text.secondary" fontWeight={500}>
                      {item.count} quotation{item.count === 1 ? '' : 's'} ({pct.toFixed(1)}%)
                    </Typography>
                  </Box>
                  <Typography variant="body2" fontWeight={700}>
                    {formatCurrency(item.totalValue, currency)}
                  </Typography>
                </Box>

                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, Math.max(0, pct))}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: 'grey.100',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 4,
                      bgcolor:
                        item.status === 'ACCEPTED' || item.status === 'COMPLETED'
                          ? 'success.main'
                          : item.status === 'DRAFT' || item.status === 'PENDING' || item.status === 'SENT'
                            ? 'primary.main'
                            : item.status === 'REJECTED' || item.status === 'CANCELLED'
                              ? 'error.main'
                              : 'warning.main',
                    },
                  }}
                />
              </Box>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
}
