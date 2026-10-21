import Alert from '@mui/material/Alert';

import { AppButton } from '../../ui/actions/AppButton';

type ErrorStateProps = {
  message: string;
  onRetry?: () => void;
};

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <Alert
      severity="error"
      action={
        onRetry ? (
          <AppButton color="inherit" size="small" onClick={onRetry}>
            Retry
          </AppButton>
        ) : undefined
      }
    >
      {message}
    </Alert>
  );
}
