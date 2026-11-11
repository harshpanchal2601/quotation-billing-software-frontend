import Alert, { type AlertColor } from '@mui/material/Alert';
import Snackbar, { type SnackbarProps } from '@mui/material/Snackbar';

export type AppSnackbarProps = Omit<SnackbarProps, 'children' | 'message' | 'onClose'> & {
  message: string | null | undefined;
  onClose: () => void;
  severity?: AlertColor;
};

export function AppSnackbar({
  anchorOrigin = { vertical: 'top', horizontal: 'right' },
  autoHideDuration = 5000,
  message,
  onClose,
  open,
  severity = 'success',
  ...snackbarProps
}: AppSnackbarProps) {
  const handleClose: NonNullable<SnackbarProps['onClose']> = (_event, reason) => {
    if (reason !== 'clickaway') onClose();
  };

  return (
    <Snackbar
      {...snackbarProps}
      anchorOrigin={anchorOrigin}
      autoHideDuration={autoHideDuration}
      onClose={handleClose}
      open={open}
    >
      <Alert severity={severity} variant="filled" role={severity === 'error' || severity === 'warning' ? 'alert' : 'status'} aria-live={severity === 'error' ? 'assertive' : 'polite'} onClose={onClose} sx={{ width: '100%', maxWidth: 480, overflowWrap: 'anywhere' }}>
        {message}
      </Alert>
    </Snackbar>
  );
}
