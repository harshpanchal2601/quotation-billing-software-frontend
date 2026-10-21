import type { Location } from 'react-router-dom';

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
