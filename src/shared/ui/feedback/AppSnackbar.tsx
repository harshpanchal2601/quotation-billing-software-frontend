import Alert, { type AlertColor } from '@mui/material/Alert';
import Snackbar, { type SnackbarProps } from '@mui/material/Snackbar';

export type AppSnackbarProps = Omit<SnackbarProps, 'children' | 'message' | 'onClose'> & {
  message: string | null | undefined;
  onClose: () => void;
  severity?: AlertColor;
};

export function AppSnackbar({
  autoHideDuration = 5000,
  message,
  onClose,
  open,
  severity = 'success',
  ...snackbarProps
}: AppSnackbarProps) {
  function handleClose() {
    onClose();
  }

  return (
    <Snackbar
      {...snackbarProps}
      autoHideDuration={autoHideDuration}
      onClose={handleClose}
      open={open}
    >
      <Alert severity={severity} variant="filled" onClose={onClose}>
        {message}
      </Alert>
    </Snackbar>
  );
}
