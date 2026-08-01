import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';

import { AppIconButton } from '@shared/ui/actions';
import { QuotationStatusChip } from '../../quotations/components/QuotationStatusChip';
import { formatCurrency } from '../../quotations/quotations.utils';
import type { ExpiringQuotationDto } from '../model/dashboard.types';

type ExpiringQuotationsSectionProps = {
  expiringQuotations: ExpiringQuotationDto[];
  currency?: string;
};

export function ExpiringQuotationsSection({ expiringQuotations, currency = 'INR' }: ExpiringQuotationsSectionProps) {
  if (!expiringQuotations || expiringQuotations.length === 0) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent sx={{ p: 2.5, textAlign: 'center', py: 4 }}>
          <CheckCircleOutlineIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
          <Typography variant="h6" fontWeight={700}>
            No Quotations Expiring Soon
          </Typography>
          <Typography variant="body2" color="text.secondary">
            All open quotations have valid dates beyond the next 7 days.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ p: 2.5, flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight={700}>
            Expiring Soon (Next 7 Days)
          </Typography>
          <Chip label={`${expiringQuotations.length} Open`} color="warning" size="small" sx={{ fontWeight: 700 }} />
        </Box>

        {/* Desktop Table */}
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Quotation No.</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Valid Until</TableCell>
                  <TableCell>Urgency</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Value</TableCell>
                  <TableCell align="center">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {expiringQuotations.map((q) => {
                  const daysText =
                    q.daysRemaining === 0
                      ? 'Expires today'
                      : q.daysRemaining === 1
                        ? '1 day remaining'
                        : `${q.daysRemaining} days remaining`;

                  return (
                    <TableRow key={q.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700} component={RouterLink} to={`/quotations/${q.id}`} sx={{ color: 'primary.main', textDecoration: 'none' }}>
                          {q.quotationNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>{q.companySnapshotName}</TableCell>
                      <TableCell>{new Date(q.validUntil).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Chip
                          label={daysText}
                          color={q.daysRemaining <= 2 ? 'error' : 'warning'}
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell>
                        <QuotationStatusChip status={q.status} size="small" />
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {formatCurrency(q.grandTotal, q.currency || currency)}
                      </TableCell>
                      <TableCell align="center">
                        <AppIconButton component={RouterLink} to={`/quotations/${q.id}`} size="small" color="primary" label={`View ${q.quotationNumber}`}>
                          <VisibilityOutlinedIcon fontSize="small" />
                        </AppIconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* Mobile Stacked Card View */}
        <Box sx={{ display: { xs: 'block', md: 'none' } }}>
          <Stack spacing={1.5}>
            {expiringQuotations.map((q) => {
              const daysText =
                q.daysRemaining === 0
                  ? 'Expires today'
                  : q.daysRemaining === 1
                    ? '1 day remaining'
                    : `${q.daysRemaining} days remaining`;

              return (
                <Box key={q.id} sx={{ p: 1.5, border: '1px solid', borderColor: 'grey.200', borderRadius: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" fontWeight={700} component={RouterLink} to={`/quotations/${q.id}`} sx={{ color: 'primary.main', textDecoration: 'none' }}>
                      {q.quotationNumber}
                    </Typography>
                    <Chip label={daysText} color={q.daysRemaining <= 2 ? 'error' : 'warning'} size="small" sx={{ fontWeight: 600 }} />
                  </Box>
                  <Typography variant="body2" fontWeight={500}>{q.companySnapshotName}</Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">Valid: {new Date(q.validUntil).toLocaleDateString()}</Typography>
                    <Typography variant="body2" fontWeight={700} color="primary.main">{formatCurrency(q.grandTotal, q.currency || currency)}</Typography>
                  </Box>
                </Box>
              );
            })}
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
}
