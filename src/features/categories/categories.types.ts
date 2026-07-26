export type CategoryListItem = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  linkedItemCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CategoryOption = {
  id: number;
  name: string;
  slug: string;
};

export type CategoryListParams = {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  sortBy: 'name' | 'slug' | 'createdAt' | 'updatedAt';
  sortOrder: 'asc' | 'desc';
};

export type CategoryCreateInput = {
  name: string;
  description?: string;
  isActive?: boolean;
};

export type CategoryUpdateInput = {
  name?: string;
  description?: string | null;
  isActive?: boolean;
};

export type CategoryListResponse = {
  categories: CategoryListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

export type CategoryOptionsResponse = {
  categories: CategoryOption[];
};
