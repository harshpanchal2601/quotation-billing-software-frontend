import Chip, { type ChipProps } from '@mui/material/Chip';

export type AppStatusChipVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

export type AppStatusChipProps = Omit<ChipProps, 'color' | 'label' | 'variant'> & {
  label: ChipProps['label'];
  variant?: AppStatusChipVariant;
  appearance?: ChipProps['variant'];
};

const variantColorMap: Record<AppStatusChipVariant, ChipProps['color']> = {
  success: 'success',
  warning: 'warning',
  error: 'error',
  info: 'info',
  neutral: 'default',
};

export function AppStatusChip({
  label,
  variant = 'neutral',
  appearance = 'filled',
  size = 'small',
  sx,
  ...chipProps
}: AppStatusChipProps) {
  return (
    <Chip
      {...chipProps}
      label={label}
      color={variantColorMap[variant]}
      variant={appearance}
      size={size}
      sx={{ fontWeight: 600, ...sx }}
    />
  );
}
