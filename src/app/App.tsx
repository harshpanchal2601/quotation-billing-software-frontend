import { Outlet } from 'react-router-dom';

import { useAuth } from '@features/auth';
import { ApprovalRequestBridge } from '@features/automation';
import { AppSnackbar } from '@shared/ui/feedback';

export function App() {
  const { sessionMessage, clearSessionMessage } = useAuth();

  return (
    <>
      <ApprovalRequestBridge />
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
