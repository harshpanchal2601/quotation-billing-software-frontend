import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { DataTableShell } from '@shared/ui/tables';
import { formatCurrency } from '../../quotations/quotations.utils';
import type { MonthlyTrendDto } from '../model/dashboard.types';

type MonthlyQuotationTrendProps = {
  monthlyTrend: MonthlyTrendDto[];
  currency?: string;
};

export function MonthlyQuotationTrend({ monthlyTrend, currency = 'INR' }: MonthlyQuotationTrendProps) {
  const [showTable, setShowTable] = useState(false);

  // Find max value for scaling CSS bars
  const maxTotalVal = Math.max(
    1,
    ...monthlyTrend.map((m) => Number(m.totalQuotationValue) || 0),
  );

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ p: 2.5, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Monthly Quotation Trend
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Quotation volume & total value per month
            </Typography>
          </Box>

          <Typography
            variant="caption"
            sx={{ cursor: 'pointer', color: 'primary.main', textDecoration: 'underline', fontWeight: 600 }}
            onClick={() => setShowTable(!showTable)}
            aria-label="Toggle trend view"
          >
            {showTable ? 'Visual View' : 'Table View'}
          </Typography>
        </Box>

        {showTable ? (
          <DataTableShell
            isLoading={false}
            isError={false}
            isEmpty={false}
            loadingContent={null}
            errorContent={null}
            emptyContent={null}
            tableContainerProps={{ sx: { flexGrow: 1, maxHeight: 300 } }}
          >
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Month</TableCell>
                  <TableCell align="right">Count</TableCell>
                  <TableCell align="right">Total Value</TableCell>
                  <TableCell align="right">Accepted Value</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {monthlyTrend.map((m) => (
                  <TableRow key={m.month}>
                    <TableCell>{m.label}</TableCell>
                    <TableCell align="right">{m.quotationCount}</TableCell>
                    <TableCell align="right">{formatCurrency(m.totalQuotationValue, currency)}</TableCell>
                    <TableCell align="right">{formatCurrency(m.acceptedQuotationValue, currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTableShell>
        ) : (
          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', pt: 2 }}>
            <Stack direction="row" spacing={1.5} alignItems="flex-end" sx={{ height: 200, width: '100%', overflowX: 'auto', pb: 1 }}>
              {monthlyTrend.map((m) => {
                const totalNum = Number(m.totalQuotationValue) || 0;
                const heightPct = Math.max(4, Math.round((totalNum / maxTotalVal) * 100));

                return (
                  <Box
                    key={m.month}
                    sx={{
                      flex: 1,
                      minWidth: 40,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      height: '100%',
                      justifyContent: 'flex-end',
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', mb: 0.5 }}>
                      {m.quotationCount}
                    </Typography>

                    <Box
                      sx={{
                        width: '100%',
                        maxWidth: 32,
                        height: `${heightPct}%`,
                        bgcolor: totalNum > 0 ? 'primary.main' : 'grey.200',
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 0.3s ease-in-out',
                        position: 'relative',
                        '&:hover': {
                          bgcolor: 'primary.dark',
                        },
                      }}
                      title={`${m.label}: ${m.quotationCount} quotations, ${formatCurrency(m.totalQuotationValue, currency)}`}
                    />

                    <Typography variant="caption" sx={{ fontSize: '0.7rem', mt: 1, fontWeight: 600, textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {m.label.split(' ')[0]}
                    </Typography>
                  </Box>
                );
              })}
            </Stack>

            <Box sx={{ display: 'flex', gap: 2, mt: 1.5, justifyContent: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                <Box sx={{ width: 10, height: 10, bgcolor: 'primary.main', borderRadius: '2px' }} />
                <Typography variant="caption" color="text.secondary">Total Quotation Value</Typography>
              </Box>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
