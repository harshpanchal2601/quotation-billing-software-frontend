import { Stack, TextField } from '@mui/material';
import { useId } from 'react';

export type TableSortState = { sortBy: string; sortOrder: 'asc' | 'desc' };
export type TableSortField = { key: string; label: string };
export type TableSorting = TableSortState & { fields: readonly TableSortField[]; onChange: (sort: TableSortState) => void };

export function TableSortControls({ sortBy, sortOrder, fields, onChange, allowUnsorted = false }: TableSorting & { allowUnsorted?: boolean }) {
  const id = useId();
  return <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
    <TextField id={`${id}-field`} name={`${id}-sortBy`} select SelectProps={{ native: true }} InputLabelProps={{ shrink: true }} size="small" label="Sort by" value={sortBy} onChange={(event) => onChange({ sortBy: event.target.value, sortOrder })} sx={{ minWidth: { sm: 180 } }}>
      {allowUnsorted || !sortBy ? <option value="">Original order</option> : null}
      {fields.map((field) => <option key={field.key} value={field.key}>{field.label}</option>)}
    </TextField>
    <TextField id={`${id}-direction`} name={`${id}-sortOrder`} select SelectProps={{ native: true }} InputLabelProps={{ shrink: true }} size="small" label="Sort order" value={sortOrder} disabled={!sortBy} onChange={(event) => onChange({ sortBy, sortOrder: event.target.value as TableSortState['sortOrder'] })} sx={{ minWidth: { sm: 180 } }}>
      <option value="asc">Ascending</option><option value="desc">Descending</option>
    </TextField>
  </Stack>;
}
