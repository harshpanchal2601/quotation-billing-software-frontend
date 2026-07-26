import type { DashboardOverviewQuery } from './dashboard.types';

export const dashboardQueryKeys = {
  all: ['dashboard'] as const,
  overview: (params?: DashboardOverviewQuery) => ['dashboard', 'overview', params || {}] as const,
};
