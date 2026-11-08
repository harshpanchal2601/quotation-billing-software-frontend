import { Alert, Box, Stack, Typography } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { useRef, type FormEvent, type ReactNode } from 'react';
import { toApiError } from '@shared/api/apiClient';
import { AppButton } from '@shared/ui/actions';

// A retry of unchanged fields reuses its key; editing the request starts a new
// command. This also covers a committed request whose response was lost.
export function CommandForm({ title, children, submit, saved, label = 'Save' }: { title: string; children: ReactNode; submit: (data: FormData, key: string) => Promise<unknown>; saved: () => void | Promise<unknown>; label?: string }) {
  const command = useRef<{ fingerprint: string; key: string } | null>(null);
  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const fingerprint = JSON.stringify(Array.from(data.entries()));
      if (!command.current || command.current.fingerprint !== fingerprint) command.current = { fingerprint, key: crypto.randomUUID() };
      return submit(data, command.current.key);
    },
    onSuccess: async () => { await saved(); },
  });
  return <Stack component="form" spacing={2} onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); mutation.mutate(new FormData(event.currentTarget)); }}>
    <Typography variant="h6">{title}</Typography>
    {mutation.isError ? <Alert severity="error">{toApiError(mutation.error).message}</Alert> : null}
    {mutation.isSuccess ? <Alert severity="success">Saved</Alert> : null}
    <Box component="fieldset" disabled={mutation.isPending} sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}><Stack spacing={2}>{children}<AppButton type="submit" disabled={mutation.isPending}>{label}</AppButton></Stack></Box>
  </Stack>;
}
