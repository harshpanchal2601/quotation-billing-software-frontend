import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';

export type ServerErrorAlertProps = {
  message: string | null | undefined;
  title?: string;
  onDismiss?: () => void;
};

export function ServerErrorAlert({ message, title, onDismiss }: ServerErrorAlertProps) {
  if (!message) return null;

  return (
    <Alert severity="error" onClose={onDismiss}>
      {title ? <AlertTitle>{title}</AlertTitle> : null}
      {message}
    </Alert>
  );
}
