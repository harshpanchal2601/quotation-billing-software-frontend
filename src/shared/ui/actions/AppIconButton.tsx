import CircularProgress from '@mui/material/CircularProgress';
import IconButton, { type IconButtonProps } from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { forwardRef, type ElementType, type ReactNode } from 'react';

export type AppIconButtonProps = Omit<IconButtonProps, 'aria-label' | 'children'> & {
  label: string;
  children: ReactNode;
  tooltip?: ReactNode;
  isLoading?: boolean;
  loadingLabel?: string;
  component?: ElementType;
  to?: string;
  state?: unknown;
  replace?: boolean;
};

export const AppIconButton = forwardRef<HTMLButtonElement, AppIconButtonProps>(
  function AppIconButton(
    {
      label,
      children,
      tooltip,
      isLoading = false,
      loadingLabel,
      disabled,
      onClick,
      size = 'small',
      ...iconButtonProps
    },
    ref,
  ) {
    const isDisabled = disabled || isLoading;
    const button = (
      <IconButton
        {...iconButtonProps}
        ref={ref}
        size={size}
        aria-label={label}
        aria-busy={isLoading || undefined}
        disabled={isDisabled}
        onClick={isLoading ? undefined : onClick}
      >
        {isLoading ? (
          <CircularProgress
            size={size === 'small' ? 18 : 22}
            aria-label={loadingLabel ?? `Loading ${label}`}
          />
        ) : (
          children
        )}
      </IconButton>
    );

    if (!tooltip) return button;

    return (
      <Tooltip title={tooltip}>
        <span>{button}</span>
      </Tooltip>
    );
  },
);
