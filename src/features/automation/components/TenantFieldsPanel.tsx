import Alert from '@mui/material/Alert';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { PERMISSIONS, useHasPermission } from '@features/auth';
import { toApiError } from '@shared/api/apiClient';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { AppButton } from '@shared/ui/actions';
import { getFieldValues, saveFieldValues, searchFieldValues } from '../api/automation.api';
import type { FieldConfiguration, FieldRecord, FieldValues, PublishedDefinition } from '../model/automation.types';

type Entity = 'COMPANY' | 'ITEM' | 'QUOTATION';
export function TenantFieldsPanel({ entity, entityId, editable = false }: { entity: Entity; entityId: number; editable?: boolean }) {
  const allowed = useHasPermission(PERMISSIONS.AUTOMATION_VIEW);
  return allowed ? <FieldsPanel entity={entity} entityId={entityId} editable={editable} /> : null;
}
function FieldsPanel({ entity, entityId, editable }: { entity: Entity; entityId: number; editable: boolean }) {
  const firmId = useFirmId(); const [expanded, setExpanded] = useState(false); const [historyPage, setHistoryPage] = useState(1);
  const query = useQuery({ queryKey: ['tenant-fields', firmId, entity, entityId, historyPage], queryFn: () => getFieldValues(entity, entityId, historyPage), enabled: expanded });
  return <Stack spacing={2}><AppButton variant="outlined" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>{expanded ? 'Hide additional business fields' : 'Additional business fields'}</AppButton>
    {expanded && query.isPending ? <Typography role="status">Loading fields…</Typography> : null}
    {expanded && query.isError ? <Alert severity="error">{toApiError(query.error).message}<AppButton onClick={() => void query.refetch()}>Retry</AppButton></Alert> : null}
    {expanded && query.data?.writable === false ? <Alert severity="info">This quotation retains its document field snapshot. Create a new revision to change additional fields.</Alert> : null}
    {expanded && query.data ? <ValueForm key={`${firmId}:${entity}:${entityId}:${query.data.current?.version ?? 0}:${query.data.definition?.id ?? 0}`} entity={entity} entityId={entityId} editable={editable && query.data.writable !== false} definition={query.data.definition} current={query.data.current} /> : null}
    {expanded && query.data?.history ? <details><summary>Value history</summary><Stack spacing={2}>{query.data.history.map((record) => <Stack key={record.id}><Typography>Value version {record.version} · Definition version {record.definition.version}</Typography>{(record.definition.definition as FieldConfiguration).fields.map((field) => <Typography variant="body2" key={field.key}>{field.label}: {String(record.values[field.key] ?? '')}</Typography>)}</Stack>)}<Stack direction="row"><AppButton disabled={historyPage === 1} onClick={() => setHistoryPage((page) => page - 1)}>Previous values</AppButton><AppButton disabled={query.data.history.length < 50} onClick={() => setHistoryPage((page) => page + 1)}>More values</AppButton></Stack></Stack></details> : null}
  </Stack>;
}
function ValueForm({ entity, entityId, editable, definition, current }: { entity: Entity; entityId: number; editable: boolean; definition: PublishedDefinition | null; current: FieldRecord | null }) {
  const firmId = useFirmId(); const cache = useQueryClient(); const [values, setValues] = useState<FieldValues>(current?.values ?? {});
  const [refresh, setRefresh] = useState(false); const [searchKey, setSearchKey] = useState(''); const [searchValue, setSearchValue] = useState('');
  const save = useMutation({ mutationFn: () => saveFieldValues(entity, entityId, current?.version ?? 0, definition!.id, values), onSuccess: () => cache.invalidateQueries({ queryKey: ['tenant-fields', firmId, entity, entityId] }) });
  const search = useMutation({ mutationFn: () => searchFieldValues(entity, searchKey, searchValue) });
  const config = (refresh || !current ? definition?.definition : current.definition.definition) as FieldConfiguration | undefined;
  const stale = Boolean(current && current.definitionId !== definition?.id);
  if (!config?.enabled) return <Typography>No active custom fields for this record type.</Typography>;
  return <Stack spacing={2} component="form" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
    <Typography variant="body2">Value version {current?.version ?? 0} · Definition version {(refresh || !current ? definition : current.definition)?.version}</Typography>
    {stale && !refresh ? <Alert severity="info">A newer definition is available. Review it before changing these values.<AppButton onClick={() => { setRefresh(true); const latest = definition?.definition as FieldConfiguration | undefined; setValues(Object.fromEntries((latest?.fields ?? []).map((field) => [field.key, current?.values[field.key] ?? null]))); }}>Review latest fields</AppButton></Alert> : null}
    {config.fields.map((field) => field.type === 'BOOLEAN' ? <FormControlLabel key={field.key} label={field.label} control={<Switch checked={values[field.key] === true} disabled={!editable || save.isPending} onChange={(_, value) => setValues({ ...values, [field.key]: value })} />} /> : <TextField key={field.key} label={field.label} required={field.required} disabled={!editable || save.isPending} select={field.type === 'SELECT'} type={field.type === 'DATE' ? 'date' : 'text'} InputLabelProps={field.type === 'DATE' ? { shrink: true } : undefined} value={values[field.key] ?? ''} onChange={(event) => setValues({ ...values, [field.key]: event.target.value })} helperText={field.visibility === 'INTERNAL' ? 'Internal business field' : 'Visible on documents'}>{field.type === 'SELECT' ? [<MenuItem key="empty" value="">Not specified</MenuItem>, ...field.options.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)] : undefined}</TextField>)}
    {save.isError ? <Alert severity="error">{toApiError(save.error).message}</Alert> : null}
    {editable ? <AppButton type="submit" disabled={save.isPending || stale && !refresh || !definition || !definition.definition.enabled}>Save new value version</AppButton> : null}
    {config.fields.some((field) => field.searchable) ? <><Typography variant="subtitle1">Find records by an additional field</Typography><TextField select label="Search field" value={searchKey} onChange={(event) => setSearchKey(event.target.value)}>{config.fields.filter((field) => field.searchable).map((field) => <MenuItem key={field.key} value={field.key}>{field.label}</MenuItem>)}</TextField><TextField label="Exact value" value={searchValue} onChange={(event) => setSearchValue(event.target.value)} /><AppButton disabled={!searchKey || search.isPending} onClick={() => search.mutate()}>Find records</AppButton>{search.isError ? <Alert severity="error">{toApiError(search.error).message}</Alert> : null}{search.data ? <Typography>Matching record IDs: {search.data.entityIds.join(', ') || 'None'}</Typography> : null}</> : null}
  </Stack>;
}
