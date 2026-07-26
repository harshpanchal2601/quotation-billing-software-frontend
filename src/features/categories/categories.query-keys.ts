import type { CategoryListParams } from './categories.types';

export const categoriesQueryKeys = {
  all: ['categories'] as const,
  lists: () => [...categoriesQueryKeys.all, 'list'] as const,
  list: (params: CategoryListParams) => [...categoriesQueryKeys.lists(), params] as const,
  details: () => [...categoriesQueryKeys.all, 'detail'] as const,
  detail: (id: number) => [...categoriesQueryKeys.details(), id] as const,
  options: () => [...categoriesQueryKeys.all, 'options'] as const,
};
