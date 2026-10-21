import { apiClient, type ApiSuccessResponse } from '@shared/api/apiClient';
import type {
  CategoryCreateInput,
  CategoryListItem,
  CategoryListParams,
  CategoryListResponse,
  CategoryOption,
  CategoryOptionsResponse,
  CategoryUpdateInput,
} from '../model/categories.types';

export async function listCategoriesRequest(params: CategoryListParams): Promise<CategoryListResponse> {
  const response = await apiClient.get<ApiSuccessResponse<CategoryListResponse>>('/categories', { params });
  return response.data.data;
}

export async function getCategoryOptionsRequest(): Promise<CategoryOption[]> {
  const response = await apiClient.get<ApiSuccessResponse<CategoryOptionsResponse>>('/categories/options');
  return response.data.data.categories;
}

export async function getCategoryRequest(id: number): Promise<CategoryListItem> {
  const response = await apiClient.get<ApiSuccessResponse<{ category: CategoryListItem }>>(`/categories/${id}`);
  return response.data.data.category;
}

export async function createCategoryRequest(data: CategoryCreateInput): Promise<CategoryListItem> {
  const response = await apiClient.post<ApiSuccessResponse<{ category: CategoryListItem }>>('/categories', data);
  return response.data.data.category;
}

export async function updateCategoryRequest(id: number, data: CategoryUpdateInput): Promise<CategoryListItem> {
  const response = await apiClient.put<ApiSuccessResponse<{ category: CategoryListItem }>>(`/categories/${id}`, data);
  return response.data.data.category;
}

export async function updateCategoryStatusRequest(id: number, isActive: boolean): Promise<CategoryListItem> {
  const response = await apiClient.patch<ApiSuccessResponse<{ category: CategoryListItem }>>(`/categories/${id}/status`, { isActive });
  return response.data.data.category;
}

export async function deleteCategoryRequest(id: number): Promise<void> {
  await apiClient.delete(`/categories/${id}`);
}
