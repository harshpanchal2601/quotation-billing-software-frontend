import { Alert, Stack, TextField, Typography } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PERMISSIONS, useAuth, useHasPermission } from '@features/auth';
import { apiClient, toApiError, type ApiSuccessResponse } from '@shared/api/apiClient';
import { EmptyState } from '@shared/components/common/EmptyState';
import { ErrorState } from '@shared/components/common/ErrorState';
import { CommandForm } from '@shared/forms/CommandForm';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { AppButton } from '@shared/ui/actions';
import { AppDialog } from '@shared/ui/dialogs';
import { formatBusinessAction, formatRecordField, formatRecordStatus, formatRecordValue } from '@shared/ui/display';
import { DetailFields, DetailSection, PageContainer, PageHeader } from '@shared/ui/layout';
import { DataTableShell, RecordTable, TableSkeleton, TableSortControls, useTableSort } from '@shared/ui/tables';
import { decideApproval, listApprovals, performApprovedAction } from '../api/automation.api';
import { NotificationPreferences } from '../components/NotificationPreferences';
import type { Approval } from '../model/automation.types';

const sortFields = [{ key: 'createdAt', label: 'Requested' }, { key: 'status', label: 'Status' }, { key: 'expiresAt', label: 'Expires' }, { key: 'requesterId', label: 'Requester number' }];
function activeRequest(approval: Approval) { return !approval.consumedAt && new Date(approval.expiresAt).getTime() > Date.now(); }
function approvalStatus(approval: Approval) {
  if (approval.consumedAt) return 'Performed';
  if (['PENDING', 'APPROVED'].includes(approval.status) && !activeRequest(approval)) return 'Expired';
  return approval.status === 'REVOKED' ? 'Approval withdrawn' : formatRecordStatus(approval.status);
}
const decisionMessages: Record<string, string> = {
  PERFORM: 'The approved action completed.', APPROVED: 'Approval recorded. The requester can now perform this action.',
  REJECTED: 'Request rejected.', REVOKED: 'Approval withdrawn.', CANCELLED: 'Approval request cancelled.',
};
export function ApprovalsPage() {
  const firmId = useFirmId(); const { user } = useAuth();
  return <ApprovalInbox key={`${firmId}:${user?.id}`} />;
}
function ApprovalInbox() {
  const { user } = useAuth(); const firmId = useFirmId(); const cache = useQueryClient(); const navigate = useNavigate();
  const canChangeQuotationStatus = useHasPermission(PERMISSIONS.QUOTATIONS_STATUS);
  const [page, setPage] = useState(1); const [reason, setReason] = useState('');
  const [selected, setSelected] = useState<{ approval: Approval; decision: string } | null>(null);
  const [viewing, setViewing] = useState<Approval | null>(null);
  const sorting = useTableSort(sortFields, { defaultSortBy: 'createdAt', paramPrefix: 'approvals', onChange: () => setPage(1) });
  const sort = { sortBy: sorting.sortBy, sortOrder: sorting.sortOrder };
  const query = useQuery({ queryKey: ['approvals', firmId, user?.id, page, sort], queryFn: () => listApprovals(page, sort), refetchInterval: 15000 });
  const notifications = useQuery({ queryKey: ['automation-inbox', firmId, user?.id], queryFn: async () => (await apiClient.get<ApiSuccessResponse<{ notifications: Array<{ id: number; title: string; body: string; createdAt: string }> }>>('/notifications')).data.data.notifications, refetchInterval: 30000 });
  const open = (approval: Approval, decision: string) => { setSelected({ approval, decision }); setReason(''); };
  const actions = (approval: Approval) => {
    const active = activeRequest(approval); const canDecide = user?.accountType === 'FIRM_ADMIN' && approval.requesterId !== user.id;
    return <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      <AppButton size="small" variant="outlined" onClick={() => setViewing(approval)}>View request</AppButton>
      {active && approval.status === 'PENDING' && canDecide ? <><AppButton size="small" onClick={() => open(approval, 'APPROVED')}>Approve</AppButton><AppButton size="small" color="error" onClick={() => open(approval, 'REJECTED')}>Reject</AppButton></> : null}
      {active && approval.status === 'APPROVED' && canDecide ? <AppButton size="small" color="error" onClick={() => open(approval, 'REVOKED')}>Withdraw approval</AppButton> : null}
      {active && approval.status === 'PENDING' && approval.requesterId === user?.id ? <AppButton size="small" onClick={() => open(approval, 'CANCELLED')}>Cancel request</AppButton> : null}
      {active && approval.status === 'APPROVED' && approval.requesterId === user?.id ? approval.command.action === 'QUOTATION_SEND' && approval.command.status === undefined ? <AppButton size="small" onClick={() => navigate(`/quotations/${approval.command.entityId}`)}>Return to send approved email</AppButton> : <AppButton size="small" disabled={approval.command.action === 'QUOTATION_SEND' && !canChangeQuotationStatus} onClick={() => open(approval, 'PERFORM')}>Perform approved action</AppButton> : null}
    </Stack>;
  };
  return <PageContainer><PageHeader title="Approvals and notifications" description="Review requested actions, decisions and notifications for your firm." />
    <DetailSection title="Approval requests" description="An approval allows the requester to perform the exact reviewed action. A different firm administrator must review it.">
      <Stack spacing={2}><TableSortControls {...sorting} />
        <DataTableShell wrapInTableContainer={false} isLoading={query.isPending} isError={query.isError} isEmpty={!query.data?.length} loadingContent={<TableSkeleton rowCount={3} />} errorContent={<ErrorState message={toApiError(query.error).message} onRetry={() => void query.refetch()} />} emptyContent={<EmptyState title="No approval requests" description="Approval requests will appear here when submitted." />}>
          <RecordTable rows={query.data ?? []} rowKey={(approval) => approval.id} label="Approval requests" rowNumberStart={(page - 1) * 50 + 1} sorting={sorting} showSortControls={false} columns={[
            { key: 'action', label: 'Action', minWidth: 220, render: (approval) => formatBusinessAction(approval.command.action, typeof approval.command.status === 'string' ? approval.command.status : undefined) },
            { key: 'record', label: 'Record', minWidth: 220, render: (approval) => String(approval.evidence.documentNumber ?? `Record #${approval.command.entityId}`) },
            { key: 'status', label: 'Status', sortKey: 'status', render: approvalStatus },
            { key: 'requester', label: 'Requested by', sortKey: 'requesterId', render: (approval) => approval.requester?.name ?? `User #${approval.requesterId}` },
            { key: 'created', label: 'Requested', sortKey: 'createdAt', render: (approval) => new Date(approval.createdAt).toLocaleString() },
            { key: 'expires', label: 'Expires', sortKey: 'expiresAt', render: (approval) => new Date(approval.expiresAt).toLocaleString() },
            { key: 'actions', label: 'Actions', minWidth: 300, render: actions },
          ]} />
        </DataTableShell>
        <Stack direction="row" justifyContent="flex-end" spacing={1}><AppButton disabled={page === 1 || query.isFetching} onClick={() => setPage((value) => value - 1)}>Previous requests</AppButton><AppButton disabled={query.isFetching || query.isError || (query.data?.length ?? 0) < 50} onClick={() => setPage((value) => value + 1)}>More requests</AppButton></Stack>
      </Stack>
    </DetailSection>
    <NotificationPreferences />
    <DetailSection title="Recent in-app notifications" description="Your latest 100 notifications, including their original message and date.">
      <DataTableShell wrapInTableContainer={false} isLoading={notifications.isPending} isError={notifications.isError} isEmpty={!notifications.data?.length} loadingContent={<TableSkeleton rowCount={3} />} errorContent={<ErrorState message={toApiError(notifications.error).message} onRetry={() => void notifications.refetch()} />} emptyContent={<EmptyState title="No notifications" description="No notifications yet." />}>
        <RecordTable rows={notifications.data ?? []} rowKey={(row) => row.id} label="Recent in-app notifications" columns={[
          { key: 'title', label: 'Title', minWidth: 220, sortValue: (row) => row.title, render: (row) => row.title },
          { key: 'message', label: 'Message', minWidth: 320, sortValue: (row) => row.body, render: (row) => <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{row.body}</Typography> },
          { key: 'created', label: 'Date', sortValue: (row) => row.createdAt, render: (row) => new Date(row.createdAt).toLocaleString() },
        ]} />
      </DataTableShell>
    </DetailSection>
    <AppDialog open={viewing !== null} title="Approval request details" fullWidth maxWidth="md" showCloseButton onClose={() => setViewing(null)} actions={<AppButton onClick={() => setViewing(null)}>Close</AppButton>}>
      {viewing ? <Stack spacing={2}>
        <DetailSection title="Request summary"><DetailFields fields={[{ label: 'Action', value: formatBusinessAction(viewing.command.action, typeof viewing.command.status === 'string' ? viewing.command.status : undefined) }, { label: 'Status', value: approvalStatus(viewing) }, { label: 'Requested by', value: viewing.requester?.name ?? `User #${viewing.requesterId}` }, { label: 'Policy version', value: viewing.policy.version }, { label: 'Requested', value: new Date(viewing.createdAt).toLocaleString() }, { label: 'Expires', value: new Date(viewing.expiresAt).toLocaleString() }]} /></DetailSection>
        <DetailSection title="Record reviewed"><DetailFields fields={Object.entries(viewing.evidence).map(([key, value]) => ({ label: formatRecordField(key), value: formatRecordValue(value, key) }))} /></DetailSection>
        <DetailSection title="Requested changes"><DetailFields fields={Object.entries(viewing.command).filter(([key]) => !['action', 'entityId', 'idempotencyKey'].includes(key)).map(([key, value]) => ({ label: formatRecordField(key), value: formatRecordValue(value, key) }))} /></DetailSection>
        <DetailSection title="Decision history"><RecordTable rows={viewing.decisions} rowKey={(row) => row.id} label="Approval decisions" columns={[
          { key: 'date', label: 'Date', sortValue: (row) => row.createdAt, render: (row) => new Date(row.createdAt).toLocaleString() },
          { key: 'reviewer', label: 'Reviewed by', sortValue: (row) => row.actor?.name ?? row.actorId, render: (row) => row.actor?.name ?? `User #${row.actorId}` },
          { key: 'decision', label: 'Decision', sortValue: (row) => row.decision, render: (row) => row.decision === 'REVOKED' ? 'Approval withdrawn' : formatRecordStatus(row.decision) },
          { key: 'reason', label: 'Reason', minWidth: 260, sortValue: (row) => row.reason, render: (row) => row.reason },
        ]} /></DetailSection>
      </Stack> : null}
    </AppDialog>
    {selected ? <CommandForm dialog initialOpen hideTrigger title={selected.decision === 'PERFORM' ? 'Perform this approved action?' : 'Record approval decision'} label="Confirm" onClosed={() => setSelected(null)} successMessage={decisionMessages[selected.decision]} isSubmitDisabled={selected.decision !== 'PERFORM' && reason.trim().length < 5}
      submit={async (data) => {
        if (selected.decision === 'PERFORM') await performApprovedAction(selected.approval.command);
        else await decideApproval(selected.approval.id, selected.decision, String(data.get('reason') ?? '').trim());
      }} saved={async () => {
        setViewing(null);
        await Promise.all([
          cache.invalidateQueries({ queryKey: ['approvals', firmId] }, { throwOnError: true }),
          cache.invalidateQueries({ predicate: (entry) => entry.queryKey[0] !== 'approvals' }, { throwOnError: true }),
        ]);
      }}>
      <input type="hidden" name="approval" value={JSON.stringify({ id: selected.approval.id, decision: selected.decision, command: selected.approval.command })} />
      <Alert severity={selected.decision === 'PERFORM' ? 'warning' : 'info'}>{selected.decision === 'PERFORM' ? 'This submits the original action using your current permissions. Record status, totals and approval authority are checked again.' : `Decision: ${selected.decision === 'REVOKED' ? 'Withdraw approval' : formatRecordStatus(selected.decision)}. Your reason will remain in the decision history.`}</Alert>
      <DetailFields fields={[{ label: 'Action', value: formatBusinessAction(selected.approval.command.action, typeof selected.approval.command.status === 'string' ? selected.approval.command.status : undefined) }, { label: 'Record', value: String(selected.approval.evidence.documentNumber ?? `Record #${selected.approval.command.entityId}`) }]} />
      {selected.decision !== 'PERFORM' ? <TextField name="reason" autoFocus multiline required label="Decision reason" value={reason} inputProps={{ minLength: 5, maxLength: 2000 }} helperText="Enter 5 to 2,000 characters." onChange={(event) => setReason(event.target.value)} /> : null}
    </CommandForm> : null}
  </PageContainer>;
}
