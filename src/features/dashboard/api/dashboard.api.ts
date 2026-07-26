import { apiClient, type ApiSuccessResponse } from '../../../services/apiClient';
import type { DashboardOverviewData, DashboardOverviewQuery } from '../dashboard.types';

export async function getDashboardOverviewRequest(
  params?: DashboardOverviewQuery,
): Promise<DashboardOverviewData> {
  const response = await apiClient.get<ApiSuccessResponse<DashboardOverviewData>>('/dashboard/overview', {
    params,
  });
  return response.data.data;
}
