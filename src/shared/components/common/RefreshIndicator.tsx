import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { useStableLoadingIndicator } from '@shared/hooks/useStableLoadingIndicator';

type RefreshIndicatorProps = {
  show: boolean;
  label?: string;
  delayMs?: number;
  minimumVisibleMs?: number;
};

export function RefreshIndicator({
  show,
  label = 'Refreshing...',
  delayMs,
  minimumVisibleMs,
}: RefreshIndicatorProps) {
  const showStableIndicator = useStableLoadingIndicator(show, { delayMs, minimumVisibleMs });

  if (!showStableIndicator) return null;

  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      role="status"
      aria-live="polite"
      sx={{ color: 'text.secondary', minHeight: 24 }}
    >
      <CircularProgress size={16} aria-label={label} />
      <Typography variant="body2">{label}</Typography>
    </Stack>
  );
}
