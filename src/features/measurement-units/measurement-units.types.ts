export type MeasurementUnitListItem = {
  id: number;
  name: string;
  symbol: string;
  allowDecimal: boolean;
  isActive: boolean;
  linkedItemCount: number;
  createdAt: string;
  updatedAt: string;
};

export type MeasurementUnitOption = {
  id: number;
  name: string;
  symbol: string;
  allowDecimal: boolean;
};

export type MeasurementUnitListParams = {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  allowDecimal?: boolean;
  sortBy: 'name' | 'symbol' | 'createdAt' | 'updatedAt';
  sortOrder: 'asc' | 'desc';
};

export type MeasurementUnitCreateInput = {
  name: string;
  symbol: string;
  allowDecimal?: boolean;
  isActive?: boolean;
};

export type MeasurementUnitUpdateInput = {
  name?: string;
  symbol?: string;
  allowDecimal?: boolean;
  isActive?: boolean;
};

export type MeasurementUnitListResponse = {
  measurementUnits: MeasurementUnitListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

export type MeasurementUnitOptionsResponse = {
  measurementUnits: MeasurementUnitOption[];
};
