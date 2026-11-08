import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toApiError } from '@shared/api/apiClient';
import { AppButton } from '@shared/ui/actions';
import { assistantApi, type Proposal } from './assistant.api';

function display(value: unknown): string { return value === null || value === undefined ? '—' : typeof value === 'object' ? Object.entries(value).map(([key, entry]) => `${key}: ${display(entry)}`).join(', ') : String(value); }
export function ProposalReview({ proposal, onClose, onExecuted }: { proposal: Proposal; onClose: () => void; onExecuted: () => void }) {
  const confirm = useMutation({ mutationFn: () => assistantApi.confirm(proposal), onSuccess: onExecuted });
  const cancel = useMutation({ mutationFn: () => assistantApi.cancel(proposal.id), onSuccess: onClose });
  const busy = confirm.isPending || cancel.isPending;
  return <Dialog open fullWidth maxWidth="md" onClose={() => { if (!busy) onClose(); }}>
    <DialogTitle>Review {String(proposal.command.action).toLowerCase().replace(/_/g, ' ')}</DialogTitle>
    <DialogContent><Stack spacing={2}>
      <Typography>{proposal.effects}</Typography>
      <Typography>Exact target: {String(proposal.before.documentNumber ?? proposal.before.itemName ?? proposal.command.entityId)} · record {String(proposal.command.entityId)}</Typography>
      <Typography>Confirmation expires {new Date(proposal.expiresAt).toLocaleString()}.</Typography>
      <Table aria-label="Proposed changes"><TableHead><TableRow><TableCell>Field</TableCell><TableCell>Current</TableCell><TableCell>Proposed</TableCell></TableRow></TableHead><TableBody>
        {Object.entries(proposal.after).map(([field, value]) => <TableRow key={field}><TableCell>{field}</TableCell><TableCell>{display(proposal.before[field])}</TableCell><TableCell>{display(value)}</TableCell></TableRow>)}
        {Object.entries(proposal.before).filter(([field]) => !Object.prototype.hasOwnProperty.call(proposal.after, field)).map(([field, value]) => <TableRow key={field}><TableCell>{field}</TableCell><TableCell>{display(value)}</TableCell><TableCell>Unchanged</TableCell></TableRow>)}
      </TableBody></Table>
      {confirm.isError || cancel.isError ? <Alert severity="error">{toApiError(confirm.error ?? cancel.error).message}</Alert> : null}
      {confirm.data ? <Alert severity="success">The server confirmed execution. <Link to={confirm.data.href}>Open result</Link></Alert> : null}
    </Stack></DialogContent>
    <DialogActions><AppButton disabled={busy} onClick={onClose}>Close preview</AppButton><AppButton disabled={busy || !!confirm.data} onClick={() => cancel.mutate()}>Cancel proposal</AppButton><AppButton variant="contained" disabled={busy || !!confirm.data || new Date(proposal.expiresAt) <= new Date()} onClick={() => confirm.mutate()}>Confirm and execute</AppButton></DialogActions>
  </Dialog>;
}
