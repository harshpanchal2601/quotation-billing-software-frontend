import { useSyncExternalStore } from 'react';

export type SelectedFirm = { id: number; name: string };

const STORAGE_KEY = 'erp.selected-firm';
const CHANGE_EVENT = 'erp:selected-firm-change';
let cachedValue: string | null | undefined;
let cachedFirm: SelectedFirm | null = null;

export function getSelectedFirm(): SelectedFirm | null {
  if (typeof window === 'undefined') return null;
  const value = window.sessionStorage.getItem(STORAGE_KEY);
  if (value === cachedValue) return cachedFirm;
  cachedValue = value;
  if (value === null) {
    cachedFirm = null;
    return null;
  }
  try {
    const parsed = JSON.parse(value) as Partial<SelectedFirm>;
    cachedFirm = Number.isSafeInteger(parsed.id) && Number(parsed.id) > 0 && typeof parsed.name === 'string'
      ? { id: Number(parsed.id), name: parsed.name }
      : null;
    return cachedFirm;
  } catch {
    cachedFirm = null;
    return null;
  }
}

export function setSelectedFirm(firm: SelectedFirm | null) {
  if (typeof window === 'undefined') return;
  if (firm === null) window.sessionStorage.removeItem(STORAGE_KEY);
  else window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(firm));
  cachedValue = undefined;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

export function useSelectedFirm() {
  return useSyncExternalStore(subscribe, getSelectedFirm, () => null);
}
