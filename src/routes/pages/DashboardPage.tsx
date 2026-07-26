import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import CalculateOutlinedIcon from '@mui/icons-material/CalculateOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import HourglassEmptyOutlinedIcon from '@mui/icons-material/HourglassEmptyOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import RequestQuoteOutlinedIcon from '@mui/icons-material/RequestQuoteOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';

import { ErrorState } from '../../components/common/ErrorState';
import { useAuth } from '../../features/auth/auth.hooks';
import { getDashboardOverviewRequest } from '../../features/dashboard/api/dashboard.api';
import { DashboardMetricCard } from '../../features/dashboard/components/DashboardMetricCard';
import { DashboardPeriodFilter } from '../../features/dashboard/components/DashboardPeriodFilter';
import { ExpiringQuotationsSection } from '../../features/dashboard/components/ExpiringQuotationsSection';
import { MonthlyQuotationTrend } from '../../features/dashboard/components/MonthlyQuotationTrend';
import { QuotationStatusBreakdown } from '../../features/dashboard/components/QuotationStatusBreakdown';
import { RecentQuotationsSection } from '../../features/dashboard/components/RecentQuotationsSection';
import { TopCustomersSection } from '../../features/dashboard/components/TopCustomersSection';
import { dashboardQueryKeys } from '../../features/dashboard/dashboard.query-keys';
import type { DashboardOverviewQuery, DashboardPeriod } from '../../features/dashboard/dashboard.types';
import { formatCurrency } from '../../features/quotations/quotations.utils';
import { paths } from '../routeConfig';

export function DashboardPage() {
  const { user } = useAuth();
  const firstName = user?.name.split(' ')[0] ?? 'there';
  const [searchParams, setSearchParams] = useSearchParams();

  // Read URL query params
  const periodParam = (searchParams.get('period') as DashboardPeriod) || 'CURRENT_FINANCIAL_YEAR';
  const dateFromParam = searchParams.get('dateFrom') || undefined;
  const dateToParam = searchParams.get('dateTo') || undefined;

  const queryParams: DashboardOverviewQuery = {
    period: periodParam,
    dateFrom: dateFromParam,
    dateTo: dateToParam,
  };

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: dashboardQueryKeys.overview(queryParams),
    queryFn: () => getDashboardOverviewRequest(queryParams),
    staleTime: 60000,
  });

  const handlePeriodChange = (newPeriod: DashboardPeriod, newFrom?: string, newTo?: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('period', newPeriod);

    if (newPeriod === 'CUSTOM' && newFrom && newTo) {
      params.set('dateFrom', newFrom);
      params.set('dateTo', newTo);
    } else {
      params.delete('dateFrom');
      params.delete('dateTo');
    }

    setSearchParams(params, { replace: true });
  };

  if (isLoading) {
    return (
      <Stack spacing={3}>
        <Skeleton variant="text" width={250} height={40} />
        <Grid container spacing={2}>
          {[1, 2, 3, 4, 5, 6, 7].map((k) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={k}>
              <Skeleton variant="rectangular" height={130} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Skeleton variant="rectangular" height={320} sx={{ borderRadius: 2 }} />
          </Grid>
          <Grid item xs={12} md={4}>
            <Skeleton variant="rectangular" height={320} sx={{ borderRadius: 2 }} />
          </Grid>
        </Grid>
      </Stack>
    );
  }

  if (isError || !data) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : 'Failed to load dashboard overview data.'}
        onRetry={refetch}
      />
    );
  }

  const {
    currency,
    range,
    quotationMetrics,
    masterDataMetrics,
    operationalMetrics,
    statusBreakdown,
    monthlyTrend,
    recentQuotations,
    expiringQuotations,
    topCustomers,
  } = data;

  return (
    <Stack spacing={3}>
      {/* Header Bar */}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={2}>
        <Box>
          <Typography component="h1" variant="h4" fontWeight={700}>
            Dashboard
          </Typography>
          <Typography color="text.secondary" variant="body2">
            Welcome back, {firstName}. Commercial quotation proposals & operational metrics overview.
          </Typography>
        </Box>

        <Button component={RouterLink} to={paths.newQuotation} variant="contained" startIcon={<AddOutlinedIcon />}>
          Create Quotation
        </Button>
      </Stack>

      {/* Period Filter */}
      <DashboardPeriodFilter
        period={range.period}
        dateFrom={range.dateFrom}
        dateTo={range.dateTo}
        rangeLabel={range.label}
        isFetching={isFetching}
        onPeriodChange={handlePeriodChange}
        onRefresh={refetch}
      />

      {/* Primary Metric Cards Grid */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <DashboardMetricCard
            title="Total Quotations"
            value={quotationMetrics.totalQuotations}
            caption="Quotations created in period"
            icon={<DescriptionOutlinedIcon />}
            iconBgColor="primary.50"
            iconColor="primary.main"
            linkTo="/quotations"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={3}>
          <DashboardMetricCard
            title="Total Quotation Value"
            value={formatCurrency(quotationMetrics.totalQuotationValue, currency)}
            caption="Value of quotations created in this period"
            icon={<RequestQuoteOutlinedIcon />}
            iconBgColor="success.50"
            iconColor="success.main"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={3}>
          <DashboardMetricCard
            title="Accepted / Completed Value"
            value={formatCurrency(quotationMetrics.acceptedQuotationValue, currency)}
            caption="Accepted and completed quotation value"
            icon={<CheckCircleOutlinedIcon />}
            iconBgColor="success.50"
            iconColor="success.main"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={3}>
          <DashboardMetricCard
            title="Average Quotation Value"
            value={formatCurrency(quotationMetrics.averageQuotationValue, currency)}
            caption="Average value per quotation in period"
            icon={<CalculateOutlinedIcon />}
            iconBgColor="info.50"
            iconColor="info.main"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={3}>
          <DashboardMetricCard
            title="Active Companies"
            value={masterDataMetrics.activeCompanies}
            caption="Current active companies"
            icon={<BusinessOutlinedIcon />}
            iconBgColor="grey.100"
            iconColor="text.primary"
            linkTo="/companies"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={3}>
          <DashboardMetricCard
            title="Active Catalogue Items"
            value={masterDataMetrics.activeItems}
            caption="Current active catalogue items"
            icon={<Inventory2OutlinedIcon />}
            iconBgColor="grey.100"
            iconColor="text.primary"
            linkTo="/items"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={3}>
          <DashboardMetricCard
            title="Expiring Soon"
            value={operationalMetrics.expiringSoonCount}
            caption="Open quotations expiring within 7 days"
            icon={<HourglassEmptyOutlinedIcon />}
            iconBgColor="warning.50"
            iconColor="warning.main"
          />
        </Grid>
      </Grid>

      {/* Main Charts & Breakdown Row */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={7} lg={8}>
          <MonthlyQuotationTrend monthlyTrend={monthlyTrend} currency={currency} />
        </Grid>

        <Grid item xs={12} md={5} lg={4}>
          <QuotationStatusBreakdown statusBreakdown={statusBreakdown} currency={currency} />
        </Grid>
      </Grid>

      {/* Recent Quotations Table / Cards */}
      <RecentQuotationsSection recentQuotations={recentQuotations} currency={currency} />

      {/* Operational Bottom Row: Expiring Soon & Top Customers */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <ExpiringQuotationsSection expiringQuotations={expiringQuotations} currency={currency} />
        </Grid>

        <Grid item xs={12} md={6}>
          <TopCustomersSection topCustomers={topCustomers} currency={currency} />
        </Grid>
      </Grid>
    </Stack>
  );
}
