const UI_DEBUG_QUERY = 'uiDebug';
const UI_DEBUG_STORAGE_KEY = 'altercadia.uiDebug';

/** Badge de diagnóstico Hybrid UI — `?uiDebug=1` ou localStorage. */
export function isHybridUiDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get(UI_DEBUG_QUERY) === '1') return true;
  try {
    return window.localStorage.getItem(UI_DEBUG_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}
