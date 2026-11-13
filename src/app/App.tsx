import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';

import { useAuth } from '@features/auth';
import { ApprovalRequestBridge } from '@features/automation';
import { NotificationProvider, useNotification } from '@shared/ui/feedback';
import { useSelectedFirm } from '@shared/tenancy/selectedFirm';

export function App() {
  const { user } = useAuth();
  const selectedFirm = useSelectedFirm();
  return <NotificationProvider key={`${user?.id ?? 'anonymous'}:${selectedFirm?.id ?? user?.firmId ?? 'none'}`}><AppContent /></NotificationProvider>;
}

function AppContent() {
  const { sessionMessage, clearSessionMessage } = useAuth();
  const notify = useNotification();
  useEffect(() => {
    if (sessionMessage) { notify(sessionMessage, 'info'); clearSessionMessage(); }
  }, [sessionMessage, clearSessionMessage, notify]);

  return (
    <>
      <ApprovalRequestBridge />
      <Outlet />
    </>
  );
}
