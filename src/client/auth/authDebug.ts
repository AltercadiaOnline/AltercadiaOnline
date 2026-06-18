import { getClientRuntimeConfig } from '../runtime/clientRuntimeConfig.js';
import { getSupabaseClient } from '../auth/supabaseAuth.js';
import { isPlayerInitLoadingVisible } from '../auth/playerInitLoading.js';

/** Logs de diagnóstico — F12 → Console durante login/cadastro. */
export function logAuthEnvironment(phase: string, extra?: Record<string, unknown>): void {
  const config = getClientRuntimeConfig();
  console.log(`[AuthDebug:${phase}]`, {
    supabaseConfigured: Boolean(config?.supabaseUrl && config?.supabaseAnonKey),
    supabaseUrl: config?.supabaseUrl ?? null,
    gameWsUrl: config?.gameWsUrl ?? null,
    serverId: config?.serverId ?? null,
    supabaseClientReady: Boolean(getSupabaseClient()),
    loadingOverlayVisible: isPlayerInitLoadingVisible(),
    ...extra,
  });
}

export function logAuthClick(buttonId: string, extra?: Record<string, unknown>): void {
  console.log(`[AuthDebug:click] #${buttonId}`, extra ?? {});
}

export function logAuthApiAttempt(action: 'login' | 'register', detail: Record<string, unknown>): void {
  console.log(`[AuthDebug:api] Tentando conectar (${action})…`, detail);
}

export function logAuthApiResult(
  action: 'login' | 'register',
  outcome: 'success' | 'error',
  detail: Record<string, unknown>,
): void {
  const label = outcome === 'success' ? 'Sucesso' : 'Erro';
  console.log(`[AuthDebug:api] ${label} (${action})`, detail);
}
