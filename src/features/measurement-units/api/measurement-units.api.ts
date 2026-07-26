import { apiClient, type ApiSuccessResponse } from '../../../services/apiClient';
import type {
  MeasurementUnitCreateInput,
  MeasurementUnitListItem,
  MeasurementUnitListParams,
  MeasurementUnitListResponse,
  MeasurementUnitOption,
  MeasurementUnitOptionsResponse,
  MeasurementUnitUpdateInput,
} from '../measurement-units.types';

export async function listMeasurementUnitsRequest(
  params: MeasurementUnitListParams,
): Promise<MeasurementUnitListResponse> {
  const response = await apiClient.get<ApiSuccessResponse<MeasurementUnitListResponse>>(
    '/measurement-units',
    { params },
  );
  return response.data.data;
}

export async function getMeasurementUnitOptionsRequest(): Promise<MeasurementUnitOption[]> {
  const response = await apiClient.get<ApiSuccessResponse<MeasurementUnitOptionsResponse>>(
    '/measurement-units/options',
  );
  return response.data.data.measurementUnits;
}

export async function getMeasurementUnitRequest(id: number): Promise<MeasurementUnitListItem> {
  const response = await apiClient.get<
    ApiSuccessResponse<{ measurementUnit: MeasurementUnitListItem }>
  >(`/measurement-units/${id}`);
  return response.data.data.measurementUnit;
}

export async function createMeasurementUnitRequest(
  data: MeasurementUnitCreateInput,
): Promise<MeasurementUnitListItem> {
  const response = await apiClient.post<
    ApiSuccessResponse<{ measurementUnit: MeasurementUnitListItem }>
  >('/measurement-units', data);
  return response.data.data.measurementUnit;
}

export async function updateMeasurementUnitRequest(
  id: number,
  data: MeasurementUnitUpdateInput,
): Promise<MeasurementUnitListItem> {
  const response = await apiClient.put<
    ApiSuccessResponse<{ measurementUnit: MeasurementUnitListItem }>
  >(`/measurement-units/${id}`, data);
  return response.data.data.measurementUnit;
}

export async function updateMeasurementUnitStatusRequest(
  id: number,
  isActive: boolean,
): Promise<MeasurementUnitListItem> {
  const response = await apiClient.patch<
    ApiSuccessResponse<{ measurementUnit: MeasurementUnitListItem }>
  >(`/measurement-units/${id}/status`, { isActive });
  return response.data.data.measurementUnit;
}

export async function deleteMeasurementUnitRequest(id: number): Promise<void> {
  await apiClient.delete(`/measurement-units/${id}`);
}
