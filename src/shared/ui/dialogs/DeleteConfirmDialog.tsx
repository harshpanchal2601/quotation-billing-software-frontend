import type { ReactNode } from 'react';

import { ConfirmDialog } from './ConfirmDialog';

export type DeleteConfirmDialogProps = {
  open: boolean;
  title: ReactNode;
  children: ReactNode;
  confirmLabel: ReactNode;
  isDeleting?: boolean;
  confirmDisabled?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeleteConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  isDeleting = false,
  confirmDisabled = false,
  onClose,
  onConfirm,
}: DeleteConfirmDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      title={title}
      confirmLabel={confirmLabel}
      confirmColor="error"
      isConfirming={isDeleting}
      confirmDisabled={confirmDisabled}
      onClose={onClose}
      onConfirm={onConfirm}
    >
      {children}
    </ConfirmDialog>
  );
}
