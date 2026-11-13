import { useSearchParams } from 'react-router-dom';
import type { TableSortField, TableSorting, TableSortState } from './TableSortControls';

export function useTableSort(fields: readonly TableSortField[], options: { defaultSortBy?: string; defaultSortOrder?: TableSortState['sortOrder']; paramPrefix?: string; onChange?: () => void } = {}): TableSorting {
  const [params, setParams] = useSearchParams();
  const sortByParam = options.paramPrefix ? `${options.paramPrefix}SortBy` : 'sortBy';
  const sortOrderParam = options.paramPrefix ? `${options.paramPrefix}SortOrder` : 'sortOrder';
  const pageParam = options.paramPrefix ? `${options.paramPrefix}Page` : 'page';
  const requested = params.get(sortByParam);
  const sortBy = fields.some((field) => field.key === requested) ? requested! : options.defaultSortBy ?? fields[0]!.key;
  const requestedOrder = params.get(sortOrderParam);
  const sortOrder = requestedOrder === 'asc' || requestedOrder === 'desc' ? requestedOrder : options.defaultSortOrder ?? 'desc';
  return {
    fields, sortBy, sortOrder,
    onChange: (nextSort) => {
      setParams((current) => {
        const next = new URLSearchParams(current);
        next.set(sortByParam, nextSort.sortBy); next.set(sortOrderParam, nextSort.sortOrder); next.delete(pageParam);
        return next;
      }, { replace: true });
      options.onChange?.();
    },
  };
}
