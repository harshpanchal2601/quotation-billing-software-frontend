import { createContext, useContext } from 'react';
import type { AlertColor } from '@mui/material/Alert';

export type Notify = (message: string, severity?: AlertColor) => () => void;
export const NotificationContext = createContext<Notify | null>(null);

export function useNotification(): Notify {
  const notify = useContext(NotificationContext);
  if (notify === null) throw new Error('NotificationProvider is required');
  return notify;
}
