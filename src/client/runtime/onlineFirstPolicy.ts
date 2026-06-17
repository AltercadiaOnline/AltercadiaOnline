import { isLocalDevHost } from '../auth/localDevAuth.js';

/**
 * Mock economy e world-login local só em localhost explícito.
 * Produção (Vercel) nunca deve reativar MockEconomyService quando o WS cai.
 */
export function allowsOfflineGameplayFallback(hostname?: string): boolean {
  if (typeof window === 'undefined') return false;
  return isLocalDevHost(hostname);
}
