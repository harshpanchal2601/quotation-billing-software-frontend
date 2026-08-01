import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';

import { EmptyState } from '@shared/components/common/EmptyState';
import { formatCurrency } from '../../quotations/quotations.utils';
import type { TopCustomerDto } from '../model/dashboard.types';

type TopCustomersSectionProps = {
  topCustomers: TopCustomerDto[];
  currency?: string;
};

export function TopCustomersSection({ topCustomers, currency = 'INR' }: TopCustomersSectionProps) {
  if (!topCustomers || topCustomers.length === 0) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent sx={{ p: 2.5 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
            Top Customers by Quotation Value
          </Typography>
          <EmptyState
            title="No Customer Quotation Data"
            description="No customer quotation activity recorded for the selected period."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ p: 2.5, flexGrow: 1 }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
          Top Customers by Quotation Value
        </Typography>

        <Stack spacing={2}>
          {topCustomers.map((cust, idx) => (
            <Box
              key={cust.companyId}
              sx={{
                p: 1.5,
                border: '1px solid',
                borderColor: 'grey.200',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 1.5,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    bgcolor: idx === 0 ? '#d97706' : 'primary.main',
                  }}
                >
                  #{idx + 1}
                </Avatar>

                <Box>
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    component={RouterLink}
                    to={`/companies/${cust.companyId}`}
                    sx={{ color: 'text.primary', textDecoration: 'none', '&:hover': { color: 'primary.main' } }}
                  >
                    {cust.companyName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {cust.quotationCount} quotation{cust.quotationCount === 1 ? '' : 's'} ({cust.acceptedQuotationCount} accepted)
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="body2" fontWeight={700} color="primary.main">
                  {formatCurrency(cust.totalQuotationValue, currency)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Accepted: {formatCurrency(cust.acceptedQuotationValue, currency)}
                </Typography>
              </Box>
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
