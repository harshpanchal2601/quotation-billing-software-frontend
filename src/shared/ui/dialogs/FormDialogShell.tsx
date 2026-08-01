import Box from '@mui/material/Box';
import type { DialogProps } from '@mui/material/Dialog';
import type { FormEvent, ReactNode } from 'react';
import { useId } from 'react';

import { AppDialog } from './AppDialog';

export type FormDialogShellProps = {
  open: boolean;
  title: ReactNode;
  children: ReactNode;
  actions: (formId: string) => ReactNode;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isSubmitting?: boolean;
  maxWidth?: DialogProps['maxWidth'];
  fullWidth?: DialogProps['fullWidth'];
};

export function FormDialogShell({
  open,
  title,
  children,
  actions,
  onClose,
  onSubmit,
  isSubmitting = false,
  maxWidth = 'sm',
  fullWidth = true,
}: FormDialogShellProps) {
  const formId = useId();

  return (
    <AppDialog
      open={open}
      title={title}
      onClose={onClose}
      preventClose={isSubmitting}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      contentDividers
      actions={actions(formId)}
    >
      <Box component="form" id={formId} onSubmit={onSubmit}>
        {children}
      </Box>
    </AppDialog>
  );
}
