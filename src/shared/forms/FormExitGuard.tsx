import { useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { UNSAFE_DataRouterContext, useBlocker } from 'react-router-dom';
import { ConfirmDialog } from '@shared/ui/dialogs';

type Props = { dirty: boolean; isSubmitting?: boolean; hasSaved?: boolean; onCancel: () => void; children: (requestCancel: () => void) => ReactNode };

// Form state stays owned by its feature. This boundary owns only leaving an
// editor, and also works in standalone forms without a data router.
export function FormExitGuard({ dirty, isSubmitting = false, hasSaved = false, onCancel, children }: Props) {
  const router = useContext(UNSAFE_DataRouterContext);
  const [review, setReview] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const cancel = useRef(onCancel); cancel.current = onCancel;
  const cancelled = useRef(false);
  const active = dirty && !hasSaved && !leaving;
  useEffect(() => {
    if (!active) return;
    const preventUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', preventUnload);
    return () => window.removeEventListener('beforeunload', preventUnload);
  }, [active]);
  useEffect(() => {
    if (leaving && !cancelled.current) { cancelled.current = true; cancel.current(); }
  }, [leaving]);
  return <>
    {children(() => { if (isSubmitting) return; if (active) setReview(true); else onCancel(); })}
    {router ? <RouterExitGuard active={active} isSubmitting={isSubmitting} /> : null}
    <ConfirmDialog open={review} title="Discard unsaved changes?" cancelLabel="Keep editing" confirmLabel="Discard changes" confirmColor="warning" isConfirming={isSubmitting} onClose={() => setReview(false)} onConfirm={() => { setReview(false); setLeaving(true); }}>Your changes have not been saved. Keep editing or discard them and return to the records.</ConfirmDialog>
  </>;
}

function RouterExitGuard({ active, isSubmitting }: { active: boolean; isSubmitting: boolean }) {
  const blocker = useBlocker(({ currentLocation, nextLocation }) => active && (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search));
  useEffect(() => { if (!active && blocker.state === 'blocked') blocker.reset(); }, [active, blocker]);
  return <ConfirmDialog open={blocker.state === 'blocked'} title="Leave without saving?" cancelLabel="Keep editing" confirmLabel="Discard and leave" confirmColor="warning" confirmDisabled={isSubmitting} onClose={() => { if (blocker.state === 'blocked') blocker.reset(); }} onConfirm={() => { if (blocker.state === 'blocked' && !isSubmitting) blocker.proceed(); }}>{isSubmitting ? 'Saving is in progress. Wait for it to finish before leaving.' : 'The changes in this editor have not been saved. Discard them to open the requested page.'}</ConfirmDialog>;
}
