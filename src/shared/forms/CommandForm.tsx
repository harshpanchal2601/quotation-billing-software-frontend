import { Alert, Box, Stack, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { toApiError } from '@shared/api/apiClient';
import { AppButton } from '@shared/ui/actions';
import type { AppButtonProps } from '@shared/ui/actions/AppButton';
import { ConfirmDialog, FormDialogShell, type FormDialogShellProps } from '@shared/ui/dialogs';
import { useNotification } from '@shared/ui/feedback';
import { FormActions } from './FormActions';
import { useCommandIdentity } from './commandIdentity';

type Confirmation = { title: string; description: string; label?: string; color?: 'primary' | 'error' | 'warning' };
type CommandFormProps = {
  title: string;
  children: ReactNode;
  submit: (data: FormData, key: string) => Promise<unknown>;
  saved: () => void | Promise<unknown>;
  onClosed?: () => void;
  isSubmitDisabled?: boolean;
  label?: string;
  cancelLabel?: string;
  submitColor?: AppButtonProps['color'];
  dialog?: boolean;
  maxWidth?: FormDialogShellProps['maxWidth'];
  initialOpen?: boolean;
  hideTrigger?: boolean;
  successMessage?: string;
  confirmation?: Confirmation;
};

function fingerprint(data: FormData) {
  return JSON.stringify(Array.from(data.entries(), ([name, value]) => [name, typeof value === 'string' ? value : [value.name, value.size, value.lastModified, value.type]]));
}

// Unchanged retries reuse identity. Successful dialog operations close back to
// the existing list; inline consumers retain their original replay behavior.
export function CommandForm({ title, children, submit, saved, label = 'Save', cancelLabel = 'Cancel', submitColor = 'primary', dialog = false, maxWidth = 'sm', initialOpen = false, hideTrigger = false, successMessage = 'Changes saved.', confirmation, onClosed, isSubmitDisabled = false }: CommandFormProps) {
  const notify = useNotification();
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down('sm'));
  const [open, setOpen] = useState(initialOpen);
  const [discard, setDiscard] = useState(false);
  const [review, setReview] = useState<FormData | null>(null);
  const form = useRef<HTMLFormElement | null>(null);
  const baseline = useRef<string | null>(null);
  const locked = useRef(false);
  const dismissFailure = useRef<(() => void) | null>(null);
  useEffect(() => () => { dismissFailure.current?.(); }, []);
  const command = useCommandIdentity();
  const close = () => { dismissFailure.current?.(); dismissFailure.current = null; setOpen(false); setDiscard(false); baseline.current = null; onClosed?.(); };
  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      return submit(data, command.getKey(fingerprint(data)));
    },
    onSuccess: async () => {
      dismissFailure.current?.(); dismissFailure.current = null;
      notify(successMessage);
      if (dialog) { close(); command.reset(); }
      try { await saved(); }
      catch { notify('Changes were saved, but the list could not refresh. Refresh the records before submitting again.', 'warning'); }
    },
    onError: (error) => { const failure = toApiError(error); if (!failure.cancelled) { dismissFailure.current?.(); dismissFailure.current = notify(failure.message, failure.approvalRequested ? 'info' : 'error'); } },
    onSettled: () => { locked.current = false; },
  });
  const execute = (data: FormData) => {
    if (locked.current || isSubmitDisabled) return;
    locked.current = true;
    setReview(null);
    mutation.mutate(data);
  };
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (locked.current || review || isSubmitDisabled) return;
    const data = new FormData(event.currentTarget);
    if (confirmation) setReview(data);
    else execute(data);
  };
  const requestClose = () => {
    if (locked.current) return;
    if (form.current && baseline.current !== fingerprint(new FormData(form.current))) setDiscard(true);
    else close();
  };
  const fields = <>
    {mutation.isError && !toApiError(mutation.error).cancelled ? <Alert severity={toApiError(mutation.error).approvalRequested ? 'info' : 'error'}>{toApiError(mutation.error).message}</Alert> : null}
    <Box component="fieldset" disabled={mutation.isPending} sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}><Stack spacing={2}>{children}</Stack></Box>
  </>;
  return <>
    {dialog ? <>
      {!hideTrigger ? <AppButton variant="outlined" disabled={mutation.isPending} onClick={() => { mutation.reset(); baseline.current = null; setOpen(true); }}>{title}</AppButton> : null}
      <FormDialogShell maxWidth={maxWidth} open={open} title={title} fullScreen={compact} onClose={requestClose} onSubmit={handleSubmit} isSubmitting={mutation.isPending} formRef={(element) => { form.current = element; if (element && baseline.current === null) baseline.current = fingerprint(new FormData(element)); }} actions={(formId) => <FormActions submitLabel={label} cancelLabel={cancelLabel} onCancel={requestClose} isSubmitting={mutation.isPending} isSubmitDisabled={isSubmitDisabled} submitButtonProps={{ form: formId, color: submitColor }} />}>
        <Stack spacing={2}>{fields}</Stack>
      </FormDialogShell>
      <ConfirmDialog open={discard} title="Discard unsaved changes?" cancelLabel="Keep editing" confirmLabel="Discard changes" confirmColor="warning" onClose={() => setDiscard(false)} onConfirm={close}>Your changes have not been saved. You can keep editing or discard them and return to the records.</ConfirmDialog>
    </> : <Stack component="form" spacing={2} onSubmit={handleSubmit}>
      <Typography variant="h6">{title}</Typography>
      {fields}
      <AppButton type="submit" color={submitColor} isLoading={mutation.isPending} disabled={isSubmitDisabled}>{label}</AppButton>
    </Stack>}
    {confirmation ? <ConfirmDialog open={review !== null} title={confirmation.title} confirmLabel={confirmation.label ?? label} confirmColor={confirmation.color ?? 'primary'} isConfirming={mutation.isPending} confirmDisabled={isSubmitDisabled} onClose={() => setReview(null)} onConfirm={() => { if (review) execute(review); }}>{confirmation.description}</ConfirmDialog> : null}
  </>;
}
