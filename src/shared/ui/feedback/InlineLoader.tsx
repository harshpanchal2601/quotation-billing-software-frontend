import CircularProgress from '@mui/material/CircularProgress';
import Stack, { type StackProps } from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

export type InlineLoaderProps = Omit<StackProps, 'children'> & {
  label?: ReactNode;
  size?: number;
};

export function InlineLoader({
  label = 'Loading...',
  size = 20,
  direction = 'row',
  spacing = 1,
  alignItems = 'center',
  ...stackProps
}: InlineLoaderProps) {
  return (
    <Stack
      role="status"
      aria-live="polite"
      direction={direction}
      spacing={spacing}
      alignItems={alignItems}
      {...stackProps}
    >
      <CircularProgress size={size} aria-hidden={Boolean(label)} />
      {label ? (
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      ) : null}
    </Stack>
  );
}
