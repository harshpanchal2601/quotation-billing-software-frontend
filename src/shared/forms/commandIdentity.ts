import { useCallback, useRef } from 'react';

// Callers fingerprint the exact submitted data without changing its values.
// A lost response can be retried; editing the command creates a new identity.
export function useCommandIdentity() {
  const command = useRef<{ fingerprint: string; key: string } | null>(null);
  const getKey = useCallback((fingerprint: string) => {
    if (command.current?.fingerprint !== fingerprint) command.current = { fingerprint, key: crypto.randomUUID() };
    return command.current.key;
  }, []);
  const reset = useCallback(() => { command.current = null; }, []);
  return { getKey, reset };
}
