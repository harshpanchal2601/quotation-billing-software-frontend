import { apiClient, type ApiSuccessResponse } from '../../../services/apiClient';
import type {
  ItemCreateInput,
  ItemDetail,
  ItemListParams,
  ItemListResponse,
  ItemOption,
  ItemOptionsResponse,
  ItemUpdateInput,
} from '../items.types';

export async function listItemsRequest(params: ItemListParams): Promise<ItemListResponse> {
  const response = await apiClient.get<ApiSuccessResponse<ItemListResponse>>('/items', { params });
  return response.data.data;
}

export async function getItemOptionsRequest(params?: {
  search?: string;
  categoryId?: number;
  limit?: number;
}): Promise<ItemOption[]> {
  const response = await apiClient.get<ApiSuccessResponse<ItemOptionsResponse>>('/items/options', { params });
  return response.data.data.items;
}

export async function getItemRequest(id: number): Promise<ItemDetail> {
  const response = await apiClient.get<ApiSuccessResponse<{ item: ItemDetail }>>(`/items/${id}`);
  return response.data.data.item;
}

export async function createItemRequest(data: ItemCreateInput): Promise<ItemDetail> {
  const response = await apiClient.post<ApiSuccessResponse<{ item: ItemDetail }>>('/items', data);
  return response.data.data.item;
}

export async function updateItemRequest(id: number, data: ItemUpdateInput): Promise<ItemDetail> {
  const response = await apiClient.put<ApiSuccessResponse<{ item: ItemDetail }>>(`/items/${id}`, data);
  return response.data.data.item;
}

export async function updateItemStatusRequest(id: number, isActive: boolean): Promise<ItemDetail> {
  const response = await apiClient.patch<ApiSuccessResponse<{ item: ItemDetail }>>(`/items/${id}/status`, { isActive });
  return response.data.data.item;
}

export async function deleteItemRequest(id: number): Promise<void> {
  await apiClient.delete(`/items/${id}`);
}

export async function uploadItemImageRequest(id: number, file: File): Promise<ItemDetail> {
  const formData = new FormData();
  formData.append('image', file);
  const response = await apiClient.post<ApiSuccessResponse<{ item: ItemDetail }>>(`/items/${id}/image`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data.data.item;
}

export async function deleteItemImageRequest(id: number): Promise<ItemDetail> {
  const response = await apiClient.delete<ApiSuccessResponse<{ item: ItemDetail }>>(`/items/${id}/image`);
  return response.data.data.item;
}
