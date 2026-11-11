import Box from '@mui/material/Box';
import type { DialogProps } from '@mui/material/Dialog';
import type { FormEvent, ReactNode, Ref } from 'react';
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
  fullScreen?: DialogProps['fullScreen'];
  formRef?: Ref<HTMLFormElement>;
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
  fullScreen,
  formRef,
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
      fullScreen={fullScreen}
      contentDividers
      actions={actions(formId)}
    >
      <Box component="form" ref={formRef} id={formId} onSubmit={onSubmit}>
        <Box component="fieldset" disabled={isSubmitting} sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}>
          {children}
        </Box>
      </Box>
    </AppDialog>
  );
}
