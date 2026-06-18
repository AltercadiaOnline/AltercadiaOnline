import { getClientRuntimeConfig, setClientRuntimeConfig } from '../runtime/clientRuntimeConfig.js';
import { ARCHITECTURE_SERVER_ID_REQUIRED, requireServerId } from '../../shared/supabase/characterServerScope.js';

const PENDING_LOGIN_SERVER_KEY = 'altercadia.pendingLoginServerId';

export function readPendingLoginServerId(): string | null {
  try {
    const raw = sessionStorage.getItem(PENDING_LOGIN_SERVER_KEY);
    return raw?.trim() ? requireServerId(raw) : null;
  } catch {
    return null;
  }
}

export function stashPendingLoginServerId(serverId: string): void {
  sessionStorage.setItem(PENDING_LOGIN_SERVER_KEY, requireServerId(serverId));
}

export function clearPendingLoginServerId(): void {
  sessionStorage.removeItem(PENDING_LOGIN_SERVER_KEY);
}

/** Shard ativo: input do jogador (#server-id-input) ou /config/client. */
export function resolveLoginServerId(): string {
  const element = document.getElementById('server-id-input');
  if (element instanceof HTMLSelectElement || element instanceof HTMLInputElement) {
    const fromInput = element.value.trim();
    if (fromInput) {
      return requireServerId(fromInput);
    }
  }

  const pending = readPendingLoginServerId();
  if (pending) {
    return pending;
  }

  const fromConfig = getClientRuntimeConfig()?.serverId;
  if (!fromConfig?.trim()) {
    throw new Error(ARCHITECTURE_SERVER_ID_REQUIRED);
  }

  return requireServerId(fromConfig);
}

/** Shard ativo da sessão — runtime config (pós-login) ou seletor de login. */
export function resolveActiveServerId(): string {
  const fromConfig = getClientRuntimeConfig()?.serverId?.trim();
  if (fromConfig) {
    return requireServerId(fromConfig);
  }
  return resolveLoginServerId();
}

/** Garante que o runtime do cliente usa o shard escolhido no login. */
export function applyLoginServerIdToRuntime(serverId: string): string {
  const scoped = requireServerId(serverId);
  const config = getClientRuntimeConfig();
  if (config && config.serverId !== scoped) {
    setClientRuntimeConfig({ ...config, serverId: scoped });
  }
  return scoped;
}
