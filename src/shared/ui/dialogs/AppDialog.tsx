import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import Box from '@mui/material/Box';
import Dialog, { type DialogProps } from '@mui/material/Dialog';
import DialogActions, { type DialogActionsProps } from '@mui/material/DialogActions';
import DialogContent, { type DialogContentProps } from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle, { type DialogTitleProps } from '@mui/material/DialogTitle';
import { forwardRef, type ReactNode, useId } from 'react';

import { AppIconButton } from '../actions/AppIconButton';

export type AppDialogProps = Omit<DialogProps, 'children' | 'onClose' | 'title'> & {
  title: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  description?: ReactNode;
  onClose?: () => void;
  preventClose?: boolean;
  showCloseButton?: boolean;
  closeButtonLabel?: string;
  contentDividers?: boolean;
  titleProps?: DialogTitleProps;
  contentProps?: DialogContentProps;
  actionsProps?: DialogActionsProps;
};

export const AppDialog = forwardRef<HTMLDivElement, AppDialogProps>(function AppDialog(
  {
    title,
    children,
    actions,
    description,
    onClose,
    preventClose = false,
    showCloseButton = false,
    closeButtonLabel = 'Close dialog',
    contentDividers = false,
    titleProps,
    contentProps,
    actionsProps,
    ...dialogProps
  },
  ref,
) {
  const generatedId = useId();
  const titleId = dialogProps['aria-labelledby'] ?? `${generatedId}-title`;
  const descriptionId =
    dialogProps['aria-describedby'] ?? (description ? `${generatedId}-description` : undefined);

  const handleClose: DialogProps['onClose'] = () => {
    if (!preventClose) onClose?.();
  };

  return (
    <Dialog
      {...dialogProps}
      ref={ref}
      onClose={onClose ? handleClose : undefined}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <DialogTitle {...titleProps} id={titleId}>
        <Box display="flex" alignItems="center" justifyContent="space-between" gap={2}>
          <Box component="span">{title}</Box>
          {showCloseButton ? (
            <AppIconButton
              label={closeButtonLabel}
              edge="end"
              onClick={onClose}
              disabled={preventClose}
            >
              <CloseOutlinedIcon />
            </AppIconButton>
          ) : null}
        </Box>
      </DialogTitle>

      {children || description ? (
        <DialogContent {...contentProps} dividers={contentDividers}>
          {description ? (
            <DialogContentText id={descriptionId} component="div">
              {description}
            </DialogContentText>
          ) : null}
          {children}
        </DialogContent>
      ) : null}

      {actions ? <DialogActions {...actionsProps}>{actions}</DialogActions> : null}
    </Dialog>
  );
});
