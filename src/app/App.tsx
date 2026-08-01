import { Outlet } from 'react-router-dom';

import { useAuth } from '@features/auth';
import { AppSnackbar } from '@shared/ui/feedback';

export function App() {
  const { sessionMessage, clearSessionMessage } = useAuth();

  return (
    <>
      <Outlet />
      <AppSnackbar
        open={sessionMessage !== null}
        autoHideDuration={6000}
        message={sessionMessage}
        severity="info"
        onClose={clearSessionMessage}
      />
    </>
  );
}
