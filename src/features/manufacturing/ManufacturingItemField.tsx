import { Alert, Autocomplete, Stack, TextField } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useAuth } from '@features/auth';
import { toApiError } from '@shared/api/apiClient';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { manufacturingItems, manufacturingKeys } from './manufacturing.api';

type Item = { id: number; name: string; itemCode: string };
export function ManufacturingItemField({ name, label }: { name: string; label: string }) {
  const firmId = useFirmId(); const { user } = useAuth(); const [search, setSearch] = useState(''); const [value, setValue] = useState<Item | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => { const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250); return () => window.clearTimeout(timer); }, [search]);
  const query = useQuery({ queryKey: [...manufacturingKeys.firm(firmId, user?.id), 'items', debouncedSearch], queryFn: ({ signal }) => manufacturingItems(debouncedSearch, signal), enabled: firmId != null });
  const options = value && !query.data?.some((row) => row.id === value.id) ? [value, ...(query.data ?? [])] : query.data ?? [];
  return <Stack spacing={1}>
    <input type="hidden" name={name} value={value?.id ?? ''} />
    <Autocomplete options={options} value={value} inputValue={search} filterOptions={(rows) => rows} getOptionLabel={(row) => `${row.itemCode} · ${row.name}`} isOptionEqualToValue={(left, right) => left.id === right.id} loading={query.isFetching} onInputChange={(_, text, reason) => { if (reason !== 'reset') { setSearch(text); if (reason === 'input') setValue(null); } }} onChange={(_, choice) => { setValue(choice); setSearch(choice ? `${choice.itemCode} · ${choice.name}` : ''); }} renderInput={(params) => <TextField {...params} label={label} required helperText="Select a tracked goods item. Type to search the catalogue." />} />
    {query.isError ? <Alert severity="error">{toApiError(query.error).message}</Alert> : null}
  </Stack>;
}
