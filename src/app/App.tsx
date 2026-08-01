import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import { Outlet } from 'react-router-dom';

import { useAuth } from '@features/auth';

export function App() {
  const { sessionMessage, clearSessionMessage } = useAuth();

  return (
    <>
      <Outlet />
      <Snackbar open={sessionMessage !== null} autoHideDuration={6000} onClose={clearSessionMessage}>
        <Alert severity="info" onClose={clearSessionMessage} variant="filled">
          {sessionMessage}
        </Alert>
      </Snackbar>
    </>
  );
}
