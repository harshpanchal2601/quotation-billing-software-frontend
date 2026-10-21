import type { DialogProps } from '@mui/material/Dialog';
import type { ReactNode } from 'react';

import { AppButton, type AppButtonProps } from '../actions/AppButton';
import { AppDialog } from './AppDialog';

export type ConfirmDialogProps = {
  open: boolean;
  title: ReactNode;
  children: ReactNode;
  cancelLabel?: ReactNode;
  confirmLabel: ReactNode;
  isConfirming?: boolean;
  confirmDisabled?: boolean;
  confirmColor?: AppButtonProps['color'];
  onClose: () => void;
  onConfirm: () => void;
  maxWidth?: DialogProps['maxWidth'];
  fullWidth?: DialogProps['fullWidth'];
};

export function ConfirmDialog({
  open,
  title,
  children,
  cancelLabel = 'Cancel',
  confirmLabel,
  isConfirming = false,
  confirmDisabled = false,
  confirmColor = 'primary',
  onClose,
  onConfirm,
  maxWidth = 'xs',
  fullWidth = true,
}: ConfirmDialogProps) {
  return (
    <AppDialog
      open={open}
      title={title}
      onClose={onClose}
      preventClose={isConfirming}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      actions={
        <>
          <AppButton onClick={onClose} disabled={isConfirming}>
            {cancelLabel}
          </AppButton>
          <AppButton
            onClick={onConfirm}
            variant="contained"
            color={confirmColor}
            isLoading={isConfirming}
            disabled={confirmDisabled}
          >
            {confirmLabel}
          </AppButton>
        </>
      }
    >
      {children}
    </AppDialog>
  );
}
