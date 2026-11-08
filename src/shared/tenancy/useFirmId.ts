import { useAuth } from '@features/auth';
import { useSelectedFirm } from './selectedFirm';

export function useFirmId() {
  const { user } = useAuth();
  const selected = useSelectedFirm();
  return user?.accountType === 'SUPER_ADMIN' ? selected?.id : user?.firmId;
}
