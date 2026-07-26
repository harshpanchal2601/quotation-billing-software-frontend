import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';

import { EmptyState } from '../../../components/common/EmptyState';
import { QuotationStatusChip } from '../../quotations/components/QuotationStatusChip';
import { formatCurrency } from '../../quotations/quotations.utils';
import type { RecentQuotationDto } from '../dashboard.types';

type RecentQuotationsSectionProps = {
  recentQuotations: RecentQuotationDto[];
  currency?: string;
};

export function RecentQuotationsSection({ recentQuotations, currency = 'INR' }: RecentQuotationsSectionProps) {
  if (!recentQuotations || recentQuotations.length === 0) {
    return (
      <Card>
        <CardContent sx={{ p: 2.5 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
            Recent Quotations
          </Typography>
          <EmptyState
            title="No Recent Quotations"
            description="There are no quotations created in the selected period."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight={700}>
            Recent Quotations
          </Typography>
          <Button component={RouterLink} to="/quotations" size="small" color="primary">
            View All
          </Button>
        </Box>

        {/* Desktop Table View */}
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Quotation No.</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Grand Total</TableCell>
                  <TableCell align="center">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentQuotations.map((q) => (
                  <TableRow key={q.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700} component={RouterLink} to={`/quotations/${q.id}`} sx={{ color: 'primary.main', textDecoration: 'none' }}>
                        {q.quotationNumber}
                      </Typography>
                    </TableCell>
                    <TableCell>{q.companySnapshotName}</TableCell>
                    <TableCell>{new Date(q.quotationDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <QuotationStatusChip status={q.status} size="small" />
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {formatCurrency(q.grandTotal, q.currency || currency)}
                    </TableCell>
                    <TableCell align="center">
                      <IconButton component={RouterLink} to={`/quotations/${q.id}`} size="small" color="primary" aria-label={`View ${q.quotationNumber}`}>
                        <VisibilityOutlinedIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* Mobile Stacked Card View */}
        <Box sx={{ display: { xs: 'block', md: 'none' } }}>
          <Stack spacing={1.5}>
            {recentQuotations.map((q) => (
              <Box key={q.id} sx={{ p: 1.5, border: '1px solid', borderColor: 'grey.200', borderRadius: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" fontWeight={700} component={RouterLink} to={`/quotations/${q.id}`} sx={{ color: 'primary.main', textDecoration: 'none' }}>
                    {q.quotationNumber}
                  </Typography>
                  <QuotationStatusChip status={q.status} size="small" />
                </Box>
                <Typography variant="body2" fontWeight={500} color="text.primary">
                  {q.companySnapshotName}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(q.quotationDate).toLocaleDateString()}
                  </Typography>
                  <Typography variant="body2" fontWeight={700} color="primary.main">
                    {formatCurrency(q.grandTotal, q.currency || currency)}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
}
