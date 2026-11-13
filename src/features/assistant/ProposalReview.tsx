import Alert from '@mui/material/Alert';
import MuiLink from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toApiError } from '@shared/api/apiClient';
import { AppButton } from '@shared/ui/actions';
import { AppDialog } from '@shared/ui/dialogs';
import { formatBusinessAction, formatRecordField, formatRecordValue } from '@shared/ui/display';
import { DetailActions, DetailFields } from '@shared/ui/layout';
import { RecordTable } from '@shared/ui/tables';
import { assistantApi, type Proposal } from './assistant.api';

type Execution = Awaited<ReturnType<typeof assistantApi.confirm>>;
export function ProposalReview({ proposal, onClose, onExecuted, onCancelled }: { proposal: Proposal; onClose: () => void; onExecuted: () => void | Promise<unknown>; onCancelled?: () => void }) {
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down('sm'));
  const requestInFlight = useRef(false);
  const completed = useRef<'executed' | 'cancelled' | null>(null);
  const expiry = new Date(proposal.expiresAt).getTime();
  const [expired, setExpired] = useState(() => !Number.isFinite(expiry) || expiry <= Date.now());
  const [execution, setExecution] = useState<Execution | null>(null);
  const [refreshWarning, setRefreshWarning] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const updateExpiry = () => {
      const remaining = expiry - Date.now();
      const hasExpired = !Number.isFinite(remaining) || remaining <= 0;
      setExpired(hasExpired);
      if (!hasExpired) timer = setTimeout(updateExpiry, Math.min(remaining, 60000));
    };
    updateExpiry();
    return () => { if (timer !== undefined) clearTimeout(timer); };
  }, [expiry]);

  const confirm = useMutation({
    mutationFn: () => assistantApi.confirm(proposal),
    onSuccess: async (result) => {
      completed.current = 'executed';
      setExecution(result);
      try { await onExecuted(); }
      catch { setRefreshWarning(true); }
    },
    onSettled: () => { requestInFlight.current = false; },
  });
  const cancel = useMutation({
    mutationFn: () => assistantApi.cancel(proposal.id),
    onSuccess: () => { completed.current = 'cancelled'; onCancelled?.(); onClose(); },
    onSettled: () => { requestInFlight.current = false; },
  });
  const busy = confirm.isPending || cancel.isPending;
  const finished = execution !== null || cancel.isSuccess;
  const close = () => { if (!requestInFlight.current) onClose(); };
  const confirmProposal = () => {
    if (requestInFlight.current || completed.current) return;
    if (!Number.isFinite(expiry) || expiry <= Date.now()) { setExpired(true); return; }
    requestInFlight.current = true;
    cancel.reset();
    confirm.mutate();
  };
  const cancelProposal = () => {
    if (requestInFlight.current || completed.current) return;
    requestInFlight.current = true;
    confirm.reset();
    cancel.mutate();
  };
  const changes = [
    ...Object.entries(proposal.after).map(([field, proposed]) => ({ field, current: proposal.before[field], proposed, unchanged: false })),
    ...Object.entries(proposal.before).filter(([field]) => !Object.prototype.hasOwnProperty.call(proposal.after, field)).map(([field, current]) => ({ field, current, proposed: undefined, unchanged: true })),
  ];

  return <AppDialog
    open fullWidth fullScreen={compact} maxWidth="md"
    title={`Review: ${formatBusinessAction(String(proposal.command.action), typeof proposal.command.status === 'string' ? proposal.command.status : undefined)}`}
    onClose={close}
    preventClose={busy}
    actions={<DetailActions label="Proposal actions">
      <AppButton disabled={busy} onClick={close}>Close preview</AppButton>
      <AppButton disabled={busy || finished} isLoading={cancel.isPending} onClick={cancelProposal}>Cancel proposal</AppButton>
      <AppButton variant="contained" disabled={busy || finished || expired} isLoading={confirm.isPending} onClick={confirmProposal}>Confirm and execute</AppButton>
    </DetailActions>}
  >
    <Stack spacing={2}>
      <Typography variant="body2">{proposal.effects}</Typography>
      <DetailFields fields={[
        { label: 'Exact target', value: formatRecordValue(proposal.before.documentNumber ?? proposal.before.itemName ?? proposal.command.entityId) },
        { label: 'Record number', value: formatRecordValue(proposal.command.entityId) },
        { label: 'Confirmation expires', value: Number.isFinite(expiry) ? new Date(expiry).toLocaleString() : 'Unavailable' },
      ]} />
      <RecordTable rows={changes} rowKey={(row) => row.field} label="Proposed changes" columns={[
        { key: 'field', label: 'Field', minWidth: 180, render: (row) => formatRecordField(row.field), sortValue: (row) => formatRecordField(row.field) },
        { key: 'current', label: 'Current', minWidth: 180, render: (row) => formatRecordValue(row.current, row.field) },
        { key: 'proposed', label: 'Proposed', minWidth: 180, render: (row) => row.unchanged ? 'Unchanged' : formatRecordValue(row.proposed, row.field) },
      ]} />
      {expired && !finished ? <Alert severity="warning">This proposal has expired. Close this preview and prepare a new proposal before confirming.</Alert> : null}
      {confirm.isError || cancel.isError ? <Alert severity="error">{toApiError(confirm.error ?? cancel.error).message}</Alert> : null}
      {execution ? <Alert severity="success">The server confirmed execution. <MuiLink component={Link} to={execution.href}>Open result</MuiLink></Alert> : null}
      {refreshWarning ? <Alert severity="warning">The action completed, but the lists could not be refreshed. Open the result or refresh this page before starting another action.</Alert> : null}
      {cancel.isSuccess ? <Alert severity="success">Proposal cancelled. No action was executed.</Alert> : null}
    </Stack>
  </AppDialog>;
}
