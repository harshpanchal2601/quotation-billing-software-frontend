import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { DashboardPage } from './pages/DashboardPage';
import * as dashboardApi from './api/dashboard.api';
import type { DashboardOverviewData } from './model/dashboard.types';

vi.mock('@features/auth', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Admin User', role: 'ADMIN' },
  }),
}));

const mockDashboardData: DashboardOverviewData = {
  currency: 'INR',
  range: {
    period: 'CURRENT_FINANCIAL_YEAR',
    dateFrom: '2026-04-01',
    dateTo: '2027-03-31',
    label: 'Financial Year 2026–27',
  },
  quotationMetrics: {
    totalQuotations: 12,
    totalQuotationValue: '1250000.00',
    averageQuotationValue: '104166.67',
    acceptedQuotationCount: 4,
    acceptedQuotationValue: '500000.00',
    completedQuotationCount: 1,
    completedQuotationValue: '150000.00',
    openQuotationCount: 5,
    openQuotationValue: '450000.00',
  },
  masterDataMetrics: {
    activeCompanies: 15,
    activeItems: 42,
  },
  operationalMetrics: {
    expiringSoonCount: 2,
    expiringWithinDays: 7,
  },
  statusBreakdown: [
    { status: 'DRAFT', count: 3, totalValue: '250000.00', percentageOfCount: '25.00' },
    { status: 'PENDING', count: 1, totalValue: '100000.00', percentageOfCount: '8.33' },
    { status: 'SENT', count: 1, totalValue: '100000.00', percentageOfCount: '8.33' },
    { status: 'ACCEPTED', count: 3, totalValue: '350000.00', percentageOfCount: '25.00' },
    { status: 'REJECTED', count: 2, totalValue: '200000.00', percentageOfCount: '16.67' },
    { status: 'EXPIRED', count: 1, totalValue: '100000.00', percentageOfCount: '8.33' },
    { status: 'CANCELLED', count: 0, totalValue: '0.00', percentageOfCount: '0.00' },
    { status: 'COMPLETED', count: 1, totalValue: '150000.00', percentageOfCount: '8.33' },
  ],
  monthlyTrend: [
    {
      month: '2026-04',
      label: 'Apr 2026',
      quotationCount: 5,
      totalQuotationValue: '500000.00',
      acceptedQuotationCount: 2,
      acceptedQuotationValue: '250000.00',
    },
  ],
  recentQuotations: [
    {
      id: 1,
      quotationNumber: 'BUMINEX/2026-27/000001',
      revisionNumber: 0,
      companySnapshotName: 'Mankind Pharma',
      contactSnapshotName: 'John Doe',
      quotationDate: '2026-04-10T00:00:00.000Z',
      validUntil: '2026-05-10T00:00:00.000Z',
      status: 'DRAFT',
      currency: 'INR',
      grandTotal: '100000.00',
      createdAt: '2026-04-10T00:00:00.000Z',
      updatedAt: '2026-04-10T00:00:00.000Z',
    },
  ],
  expiringQuotations: [
    {
      id: 2,
      quotationNumber: 'BUMINEX/2026-27/000002',
      companySnapshotName: 'Cipla Ltd',
      validUntil: '2026-04-15T00:00:00.000Z',
      daysRemaining: 2,
      status: 'SENT',
      currency: 'INR',
      grandTotal: '150000.00',
    },
  ],
  topCustomers: [
    {
      companyId: 1,
      companyName: 'Mankind Pharma',
      quotationCount: 5,
      totalQuotationValue: '500000.00',
      acceptedQuotationCount: 2,
      acceptedQuotationValue: '250000.00',
    },
  ],
};

function renderDashboardPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Dashboard Frontend Feature', () => {
  it('shows dashboard skeletons instead of false zero values during initial load', () => {
    const pendingDashboard = deferred<DashboardOverviewData>();
    vi.spyOn(dashboardApi, 'getDashboardOverviewRequest').mockReturnValue(pendingDashboard.promise);

    renderDashboardPage();

    expect(screen.queryByText('0')).not.toBeInTheDocument();
    expect(screen.queryByText('₹0.00')).not.toBeInTheDocument();
    expect(screen.queryByText('No recent quotations')).not.toBeInTheDocument();
  });

  it('renders metric cards with real backend quotation values and global master-data counts', async () => {
    vi.spyOn(dashboardApi, 'getDashboardOverviewRequest').mockResolvedValue(mockDashboardData);

    renderDashboardPage();

    // Check headings and resolved range label
    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Financial Year 2026–27')).toBeInTheDocument();

    // Metric values
    expect(screen.getByText('12')).toBeInTheDocument(); // total quotations
    expect(screen.getByText('₹12,50,000.00')).toBeInTheDocument(); // total quotation value
    expect(screen.getByText('15')).toBeInTheDocument(); // active companies
    expect(screen.getByText('42')).toBeInTheDocument(); // active items

    // Ensure monetary values are labelled as quotation value (not revenue)
    expect(screen.getByText('Value of quotations created in this period')).toBeInTheDocument();
    expect(screen.getByText('Accepted and completed quotation value')).toBeInTheDocument();
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
