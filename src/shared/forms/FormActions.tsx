import Stack, { type StackProps } from '@mui/material/Stack';
import type { ReactNode } from 'react';

import { AppButton, type AppButtonProps } from '../ui/actions/AppButton';

export type FormActionsProps = Omit<StackProps, 'children'> & {
  cancelLabel?: ReactNode;
  submitLabel: ReactNode;
  isSubmitting?: boolean;
  isSubmitDisabled?: boolean;
  isCancelDisabled?: boolean;
  onCancel: () => void;
  submitButtonProps?: Omit<AppButtonProps, 'children' | 'disabled' | 'isLoading' | 'type'>;
  cancelButtonProps?: Omit<AppButtonProps, 'children' | 'disabled' | 'onClick'>;
  secondaryAction?: ReactNode;
};

export function FormActions({
  cancelLabel = 'Cancel',
  submitLabel,
  isSubmitting = false,
  isSubmitDisabled = false,
  isCancelDisabled = false,
  onCancel,
  submitButtonProps,
  cancelButtonProps,
  secondaryAction,
  direction = { xs: 'column-reverse', sm: 'row' },
  justifyContent = 'flex-end',
  alignItems = { xs: 'stretch', sm: 'center' },
  spacing = 1,
  ...stackProps
}: FormActionsProps) {
  return (
    <Stack
      direction={direction}
      justifyContent={justifyContent}
      alignItems={alignItems}
      spacing={spacing}
      width="100%"
      {...stackProps}
    >
      {secondaryAction}
      <AppButton onClick={onCancel} disabled={isCancelDisabled || isSubmitting} {...cancelButtonProps}>
        {cancelLabel}
      </AppButton>
      <AppButton
        type="submit"
        variant="contained"
        isLoading={isSubmitting}
        disabled={isSubmitDisabled}
        {...submitButtonProps}
      >
        {submitLabel}
      </AppButton>
    </Stack>
  );
}
