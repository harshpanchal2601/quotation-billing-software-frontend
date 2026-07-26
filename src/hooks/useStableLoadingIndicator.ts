import { useEffect, useRef, useState, type MutableRefObject } from 'react';

export const DEFAULT_LOADING_DELAY_MS = 200;
export const DEFAULT_MINIMUM_LOADING_VISIBLE_MS = 400;

type StableLoadingOptions = {
  delayMs?: number;
  minimumVisibleMs?: number;
};

export function useStableLoadingIndicator(
  isLoading: boolean,
  {
    delayMs = DEFAULT_LOADING_DELAY_MS,
    minimumVisibleMs = DEFAULT_MINIMUM_LOADING_VISIBLE_MS,
  }: StableLoadingOptions = {},
) {
  const [isVisible, setIsVisible] = useState(false);
  const visibleSinceRef = useRef<number | null>(null);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    clearTimer(showTimerRef);
    clearTimer(hideTimerRef);

    if (isLoading) {
      if (isVisible) return;

      showTimerRef.current = setTimeout(() => {
        visibleSinceRef.current = Date.now();
        setIsVisible(true);
      }, delayMs);
      return;
    }

    if (!isVisible) return;

    const visibleForMs = visibleSinceRef.current === null ? minimumVisibleMs : Date.now() - visibleSinceRef.current;
    const remainingVisibleMs = Math.max(0, minimumVisibleMs - visibleForMs);

    hideTimerRef.current = setTimeout(() => {
      visibleSinceRef.current = null;
      setIsVisible(false);
    }, remainingVisibleMs);
  }, [delayMs, isLoading, isVisible, minimumVisibleMs]);

  useEffect(() => () => {
    clearTimer(showTimerRef);
    clearTimer(hideTimerRef);
  }, []);

  return isVisible;
}

function clearTimer(timerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>) {
  if (timerRef.current !== null) {
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }
}
