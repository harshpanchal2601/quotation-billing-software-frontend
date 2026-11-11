import { useLocation, useNavigate, type Location } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { toApiError } from '@shared/api/apiClient';
import { useNotification } from '@shared/ui/feedback';

type LocationStateWithFrom = {
  from?: unknown;
};

export function getCurrentListReturnState(pathname: string, search: string) {
  return { from: `${pathname}${search}` };
}

export function getSafeListReturnPath(location: Location, fallbackPath: string) {
  const from = (location.state as LocationStateWithFrom | null)?.from;
  if (typeof from !== 'string') return fallbackPath;
  if (!from.startsWith(`${fallbackPath}?`) && from !== fallbackPath) return fallbackPath;
  if (from.startsWith('//') || from.includes('://')) return fallbackPath;
  return from;
}

// Persistence has already succeeded when saved is called. A failed cache
// refresh must never make the editor offer to submit the same write again.
export function useSaveAndReturn(fallbackPath: string, { navigateAfterSave = true }: { navigateAfterSave?: boolean } = {}) {
  const location = useLocation();
  const navigate = useNavigate();
  const notify = useNotification();
  const dismissFailure = useRef<(() => void) | null>(null);
  const [hasSaved, setHasSaved] = useState(false);
  const returnPath = getSafeListReturnPath(location, fallbackPath);
  // Commit the saved state to the form's exit guard before route navigation.
  useEffect(() => { if (hasSaved && navigateAfterSave) navigate(returnPath, { replace: true }); }, [hasSaved, navigate, returnPath, navigateAfterSave]);
  const cancel = () => navigate(getSafeListReturnPath(location, fallbackPath));
  const saved = async (message: string, refresh: () => Promise<unknown>) => {
    dismissFailure.current?.(); dismissFailure.current = null;
    notify(message);
    setHasSaved(true);
    try { await refresh(); }
    catch { notify('Changes were saved, but the list could not refresh. Refresh the records before submitting again.', 'warning'); }
  };
  const failed = (error: unknown) => {
    const failure = toApiError(error);
    if (!failure.cancelled) { dismissFailure.current?.(); dismissFailure.current = notify(failure.message, 'error'); }
    return failure;
  };
  return { cancel, saved, failed, hasSaved };
}
