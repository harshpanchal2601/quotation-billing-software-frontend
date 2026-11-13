import { useCallback, useRef, useState, type ReactNode } from 'react';
import type { AlertColor } from '@mui/material/Alert';
import { AppSnackbar } from './AppSnackbar';
import { NotificationContext, type Notify } from './notifications';

type Notice = { id: number; message: string; severity: AlertColor };

// Mounted above route pages so a successful navigation does not erase feedback.
// The app keys this provider by actor/firm to discard private workspace notices.
export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const sequence = useRef(0);
  const notify = useCallback<Notify>((message, severity = 'success') => {
    if (!message.trim()) return () => undefined;
    const notice = { id: ++sequence.current, message, severity };
    setNotices((current) => {
      if (current.some((entry) => entry.message === message && entry.severity === severity)) return current;
      return [...current.slice(0, 4), notice];
    });
    return () => { setNotices((current) => current.filter((entry) => entry.message !== message || entry.severity !== severity)); };
  }, []);
  const dismiss = useCallback(() => { setNotices((current) => current.slice(1)); }, []);
  const current = notices[0];
  return <NotificationContext.Provider value={notify}>
    {children}
    <AppSnackbar key={current?.id ?? 'empty'} open={current !== undefined} message={current?.message} severity={current?.severity} autoHideDuration={current?.severity === 'error' ? null : 5000} onClose={dismiss} />
  </NotificationContext.Provider>;
}

