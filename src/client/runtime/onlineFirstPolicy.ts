/**
 * Altercadia V2 — 100% online autoritativo.
 * Fallback offline/local foi removido; produção e dev usam Supabase + Railway.
 */
export function allowsOfflineGameplayFallback(_hostname?: string): boolean {
  return false;
}

/** @deprecated Modo local removido — mantido para compatibilidade de imports. */
export function isLocalDevHost(_hostname?: string): boolean {
  return false;
}
