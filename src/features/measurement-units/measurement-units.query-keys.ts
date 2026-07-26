import type { MeasurementUnitListParams } from './measurement-units.types';

export const measurementUnitsQueryKeys = {
  all: ['measurement-units'] as const,
  lists: () => [...measurementUnitsQueryKeys.all, 'list'] as const,
  list: (params: MeasurementUnitListParams) => [...measurementUnitsQueryKeys.lists(), params] as const,
  details: () => [...measurementUnitsQueryKeys.all, 'detail'] as const,
  detail: (id: number) => [...measurementUnitsQueryKeys.details(), id] as const,
  options: () => [...measurementUnitsQueryKeys.all, 'options'] as const,
};
