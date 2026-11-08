import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PERMISSIONS, useAuth, useHasPermission } from '@features/auth';
import { apiClient, toApiError, type ApiSuccessResponse } from '@shared/api/apiClient';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { AppButton } from '@shared/ui/actions';
import { PageContainer, PageHeader } from '@shared/ui/layout';
import { decideApproval, listApprovals, performApprovedAction } from '../api/automation.api';
import { NotificationPreferences } from '../components/NotificationPreferences';
import type { Approval } from '../model/automation.types';

export function ApprovalsPage() {
  const firmId = useFirmId(); const { user } = useAuth();
  return <ApprovalInbox key={`${firmId}:${user?.id}`} />;
}
function ApprovalInbox() {
  const { user } = useAuth(); const firmId = useFirmId(); const cache = useQueryClient();
  const navigate = useNavigate(); const canChangeQuotationStatus = useHasPermission(PERMISSIONS.QUOTATIONS_STATUS);
  const [page, setPage] = useState(1); const [reason, setReason] = useState(''); const [selected, setSelected] = useState<{ approval: Approval; decision: string } | null>(null);
  const [notice, setNotice] = useState('');
  const query = useQuery({ queryKey: ['approvals', firmId, user?.id, page], queryFn: () => listApprovals(page), refetchInterval: 15000 });
  const notifications = useQuery({ queryKey: ['automation-inbox', firmId, user?.id], queryFn: async () => (await apiClient.get<ApiSuccessResponse<{ notifications: Array<{ id: number; title: string; body: string; createdAt: string }> }>>('/notifications')).data.data.notifications, refetchInterval: 30000 });
  const action = useMutation({ mutationFn: async () => {
    if (!selected) return;
    if (selected.decision === 'PERFORM') await performApprovedAction(selected.approval.command);
    else await decideApproval(selected.approval.id, selected.decision, reason);
  }, onSuccess: async () => { setNotice(selected?.decision === 'PERFORM' ? 'The approved action completed.' : 'Decision recorded. The requester may now perform an approved action.'); setSelected(null); setReason(''); await cache.invalidateQueries({ queryKey: ['approvals', firmId] }); await cache.invalidateQueries({ predicate: (entry) => entry.queryKey[0] !== 'approvals' }); } });
  const open = (approval: Approval, decision: string) => { setSelected({ approval, decision }); setReason(''); action.reset(); };
  return <PageContainer><PageHeader title="Approvals and notifications" description="Review the exact requested action and its immutable decision history." />
    {notice ? <Alert severity="success">{notice}</Alert> : null}
    {query.isPending ? <Typography role="status">Loading approvals…</Typography> : null}
    {query.isError ? <Alert severity="error">{toApiError(query.error).message}<AppButton onClick={() => void query.refetch()}>Retry</AppButton></Alert> : null}
    {query.data?.length === 0 ? <Typography>No approval requests.</Typography> : null}
    {query.data?.map((approval) => {
      const active = !approval.consumedAt && new Date(approval.expiresAt).getTime() > Date.now();
      const canDecide = user?.accountType === 'FIRM_ADMIN' && approval.requesterId !== user.id;
      return <Paper variant="outlined" sx={{ p: 2 }} key={approval.id}><Stack spacing={1}>
        <Typography variant="h6">{approval.command.action.toLowerCase().replace(/_/g, ' ')} · {approval.consumedAt ? 'Performed' : !['PENDING', 'APPROVED'].includes(approval.status) || active ? approval.status : 'Expired'}</Typography>
        <Typography variant="body2">Requester {approval.requesterId} · Policy version {approval.policy.version} · Expires {new Date(approval.expiresAt).toLocaleString()}</Typography>
        {Object.entries(approval.evidence).map(([key, value]) => <Typography key={key}>{key.replace(/([A-Z])/g, ' $1')}: {String(value)}</Typography>)}
        {Object.entries(approval.command).filter(([key]) => !['action', 'entityId', 'idempotencyKey'].includes(key)).map(([key, value]) => <Typography key={key}>{key.replace(/([A-Z])/g, ' $1')}: {String(value)}</Typography>)}
        {approval.decisions.map((decision) => <Typography variant="body2" key={decision.id}>{new Date(decision.createdAt).toLocaleString()} · User {decision.actorId} · {decision.decision}: {decision.reason}</Typography>)}
        <Stack direction="row" spacing={1}>
          {active && approval.status === 'PENDING' && canDecide ? <><AppButton onClick={() => open(approval, 'APPROVED')}>Approve</AppButton><AppButton color="error" onClick={() => open(approval, 'REJECTED')}>Reject</AppButton></> : null}
          {active && approval.status === 'APPROVED' && canDecide ? <AppButton color="error" onClick={() => open(approval, 'REVOKED')}>Revoke approval</AppButton> : null}
          {active && approval.status === 'PENDING' && approval.requesterId === user?.id ? <AppButton onClick={() => open(approval, 'CANCELLED')}>Cancel request</AppButton> : null}
          {active && approval.status === 'APPROVED' && approval.requesterId === user?.id ? approval.command.action === 'QUOTATION_SEND' && approval.command.status === undefined ? <AppButton onClick={() => navigate(`/quotations/${approval.command.entityId}`)}>Return to send approved email</AppButton> : <AppButton disabled={approval.command.action === 'QUOTATION_SEND' && !canChangeQuotationStatus} onClick={() => open(approval, 'PERFORM')}>Perform approved action</AppButton> : null}
        </Stack>
      </Stack></Paper>;
    })}
    <Stack direction="row"><AppButton disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous requests</AppButton><AppButton disabled={(query.data?.length ?? 0) < 50} onClick={() => setPage((value) => value + 1)}>More requests</AppButton></Stack>
    <NotificationPreferences />
    <Typography variant="h6">Your in-app notifications</Typography>
    {notifications.isError ? <Alert severity="error">{toApiError(notifications.error).message}<AppButton onClick={() => void notifications.refetch()}>Retry notifications</AppButton></Alert> : null}
    {notifications.data?.length === 0 ? <Typography>No notifications yet.</Typography> : null}
    {notifications.data?.map((notification) => <Paper variant="outlined" sx={{ p: 2 }} key={notification.id}><Typography variant="subtitle1">{notification.title}</Typography><Typography sx={{ whiteSpace: 'pre-wrap' }}>{notification.body}</Typography><Typography variant="caption">{new Date(notification.createdAt).toLocaleString()}</Typography></Paper>)}
    <Dialog open={selected !== null} onClose={() => { if (!action.isPending) setSelected(null); }} fullWidth><DialogTitle>{selected?.decision === 'PERFORM' ? 'Perform this approved action?' : 'Record approval decision'}</DialogTitle><DialogContent><Stack spacing={2}>
      <Typography>{selected?.decision === 'PERFORM' ? 'This submits the original action using your current permissions. Document state, totals and approval authority are checked again.' : `Decision: ${selected?.decision}. Your reason becomes part of the permanent history.`}</Typography>
      {selected?.decision !== 'PERFORM' ? <TextField autoFocus multiline label="Decision reason" value={reason} onChange={(event) => setReason(event.target.value)} /> : null}
      {action.isError ? <Alert severity="error">{toApiError(action.error).message}</Alert> : null}
    </Stack></DialogContent><DialogActions><AppButton disabled={action.isPending} onClick={() => setSelected(null)}>Close</AppButton><AppButton disabled={action.isPending || selected?.decision !== 'PERFORM' && reason.trim().length < 5} onClick={() => action.mutate()}>Confirm</AppButton></DialogActions></Dialog>
  </PageContainer>;
}
