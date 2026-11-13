import { createContext, useContext } from 'react';

// Authentication supplies this neutral context; shared code never imports a
// feature to discover the current firm. Undefined identifies a missing boundary.
export const FirmIdContext = createContext<{ firmId: number | null | undefined } | undefined>(undefined);

export function useFirmId() {
  const context = useContext(FirmIdContext);
  if (context === undefined) throw new Error('Firm context requires AuthProvider');
  return context.firmId;
}
