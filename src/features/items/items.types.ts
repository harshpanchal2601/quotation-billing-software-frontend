export type ItemSpecification = {
  label: string;
  value: string;
};

export type ItemCategorySummary = {
  id: number;
  name: string;
  slug: string;
  isActive?: boolean;
};

export type MeasurementUnitSummary = {
  id: number;
  name: string;
  symbol: string;
  allowDecimal: boolean;
  isActive?: boolean;
};

export type ItemSourceType = 'MANUAL' | 'WEBSITE_IMPORT' | 'CSV_IMPORT';

export type ItemListItem = {
  id: number;
  itemCode: string;
  name: string;
  shortDescription: string | null;
  category: ItemCategorySummary | null;
  measurementUnit: MeasurementUnitSummary;
  defaultRate: string;
  hsnCode: string | null;
  gstRate: string;
  imageUrl: string | null;
  sourceType: ItemSourceType;
  isActive: boolean;
  quotationUsageCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ItemDetail = ItemListItem & {
  detailedDescription: string | null;
  specifications: ItemSpecification[];
  sourceUrl: string | null;
};

export type ItemOption = {
  id: number;
  itemCode: string;
  name: string;
  shortDescription: string | null;
  defaultRate: string;
  gstRate: string;
  hsnCode: string | null;
  category: ItemCategorySummary | null;
  measurementUnit: MeasurementUnitSummary;
  imageUrl: string | null;
};

export type ItemListParams = {
  page: number;
  limit: number;
  search?: string;
  categoryId?: number;
  measurementUnitId?: number;
  isActive?: boolean;
  sourceType?: ItemSourceType;
  minRate?: number;
  maxRate?: number;
  sortBy: 'itemCode' | 'name' | 'defaultRate' | 'gstRate' | 'createdAt' | 'updatedAt';
  sortOrder: 'asc' | 'desc';
};

export type ItemCreateInput = {
  name: string;
  categoryId?: number | null;
  measurementUnitId: number;
  shortDescription?: string | null;
  detailedDescription?: string | null;
  specifications?: ItemSpecification[];
  defaultRate?: string | number;
  hsnCode?: string | null;
  gstRate?: string | number;
  isActive?: boolean;
};

export type ItemUpdateInput = Partial<ItemCreateInput>;

export type ItemListResponse = {
  items: ItemListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

export type ItemOptionsResponse = {
  items: ItemOption[];
};
