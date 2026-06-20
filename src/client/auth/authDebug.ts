import { getClientRuntimeConfig } from '../runtime/clientRuntimeConfig.js';
import { getSupabaseClient } from '../auth/supabaseAuth.js';
import { isPlayerInitLoadingVisible } from '../auth/playerInitLoading.js';

function authDebugLog(message: string, detail?: Record<string, unknown>): void {
  if (detail) {
    console.debug(message, detail);
    return;
  }
  console.debug(message);
}

/** Logs de diagnóstico — F12 → Console (filtro Verbose). Nunca logar URL completa do Supabase. */
export function logAuthEnvironment(phase: string, extra?: Record<string, unknown>): void {
  const config = getClientRuntimeConfig();
  authDebugLog(`[AuthDebug:${phase}]`, {
    supabaseConfigured: Boolean(config?.supabaseUrl && config?.supabaseAnonKey),
    gameWsUrl: config?.gameWsUrl ?? null,
    serverId: config?.serverId ?? null,
    supabaseClientReady: Boolean(getSupabaseClient()),
    loadingOverlayVisible: isPlayerInitLoadingVisible(),
    ...extra,
  });
}

export function logAuthClick(buttonId: string, extra?: Record<string, unknown>): void {
  authDebugLog(`[AuthDebug:click] #${buttonId}`, extra ?? {});
}

export function logAuthApiAttempt(action: 'login' | 'register', detail: Record<string, unknown>): void {
  authDebugLog(`[AuthDebug:api] Tentando conectar (${action})…`, detail);
}

export function logAuthApiResult(
  action: 'login' | 'register',
  outcome: 'success' | 'error',
  detail: Record<string, unknown>,
): void {
  const label = outcome === 'success' ? 'Sucesso' : 'Erro';
  authDebugLog(`[AuthDebug:api] ${label} (${action})`, detail);
}
