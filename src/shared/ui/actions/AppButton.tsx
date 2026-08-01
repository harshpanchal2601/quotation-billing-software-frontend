import Button, { type ButtonProps } from '@mui/material/Button';
import { forwardRef, type ElementType, type ReactNode } from 'react';

export type AppButtonProps = ButtonProps & {
  isLoading?: boolean;
  loadingLabel?: ReactNode;
  component?: ElementType;
  to?: string;
  state?: unknown;
  replace?: boolean;
};

export const AppButton = forwardRef<HTMLButtonElement, AppButtonProps>(function AppButton(
  { children, disabled, isLoading = false, loadingLabel, ...props },
  ref,
) {
  return (
    <Button
      {...props}
      ref={ref}
      aria-busy={isLoading || undefined}
      disabled={disabled || isLoading}
      loading={isLoading}
    >
      {isLoading && loadingLabel !== undefined ? loadingLabel : children}
    </Button>
  );
});
