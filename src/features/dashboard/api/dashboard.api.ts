import { apiClient, type ApiSuccessResponse } from '@shared/api/apiClient';
import type { DashboardOverviewData, DashboardOverviewQuery } from '../model/dashboard.types';

export async function getDashboardOverviewRequest(
  params?: DashboardOverviewQuery,
): Promise<DashboardOverviewData> {
  const response = await apiClient.get<ApiSuccessResponse<DashboardOverviewData>>('/dashboard/overview', {
    params,
  });
  return response.data.data;
}
