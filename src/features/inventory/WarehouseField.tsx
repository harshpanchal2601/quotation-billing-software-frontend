import { Alert, Autocomplete, Stack, TextField } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { toApiError } from '@shared/api/apiClient';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { inventoryKeys } from './inventory.api';

type Choice = { id: number; name: string };
export function WarehouseField({ name, label, context, load, required = false, selected }: { name: string; label: string; context: 'inventory' | 'fulfillment' | 'purchasing'; load: (search: string, signal: AbortSignal) => Promise<Choice[]>; required?: boolean; selected?: (id: number | undefined) => void }) {
  const firmId = useFirmId(); const [search, setSearch] = useState(''); const [value, setValue] = useState<Choice | null>(null);
  const query = useQuery({ queryKey: [...inventoryKeys.firm(firmId), 'warehouse-options', context, search], queryFn: ({ signal }) => load(search, signal), enabled: firmId != null });
  const options = value && !query.data?.some((row) => row.id === value.id) ? [value, ...(query.data ?? [])] : query.data ?? [];
  return <Stack spacing={1} useFlexGap><input type="hidden" name={name} value={value?.id ?? ''} /><Autocomplete options={options} value={value} filterOptions={(rows) => rows} getOptionLabel={(row) => row.name} isOptionEqualToValue={(left, right) => left.id === right.id} loading={query.isFetching} onInputChange={(_, text) => setSearch(text)} onChange={(_, choice) => { setValue(choice); selected?.(choice?.id); }} renderInput={(params) => <TextField {...params} label={label} required={required} helperText="Type to search warehouses." />} />{query.isError ? <Alert severity="error">{toApiError(query.error).message}</Alert> : null}</Stack>;
}
