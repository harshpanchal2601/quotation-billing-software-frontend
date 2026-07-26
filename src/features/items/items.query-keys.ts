import type { ItemListParams } from './items.types';

export const itemsQueryKeys = {
  all: ['items'] as const,
  lists: () => [...itemsQueryKeys.all, 'list'] as const,
  list: (params: ItemListParams) => [...itemsQueryKeys.lists(), params] as const,
  details: () => [...itemsQueryKeys.all, 'detail'] as const,
  detail: (id: number) => [...itemsQueryKeys.details(), id] as const,
  options: (params?: { search?: string; categoryId?: number; limit?: number }) =>
    [...itemsQueryKeys.all, 'options', params] as const,
};
