import { getClientRuntimeConfig, setClientRuntimeConfig } from '../runtime/clientRuntimeConfig.js';
import { ARCHITECTURE_SERVER_ID_REQUIRED, requireServerId } from '../../shared/supabase/characterServerScope.js';
import { resolveServerInstanceDefinition } from '../../shared/world/serverInstanceCatalog.js';

const PENDING_LOGIN_SERVER_KEY = 'altercadia.pendingLoginServerId';
const SELECTED_SERVER_KEY = 'altercadia.selectedServerId';

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

export function readSelectedServerId(): string | null {
  try {
    const raw = sessionStorage.getItem(SELECTED_SERVER_KEY);
    return raw?.trim() ? requireServerId(raw) : null;
  } catch {
    return null;
  }
}

export function stashSelectedServerId(serverId: string): void {
  sessionStorage.setItem(SELECTED_SERVER_KEY, requireServerId(serverId));
}

export function clearSelectedServerId(): void {
  sessionStorage.removeItem(SELECTED_SERVER_KEY);
}

/** Shard ativo: OAuth pending → char select → deploy (/config/client). */
export function resolveLoginServerId(): string {
  const pending = readPendingLoginServerId();
  if (pending) {
    return pending;
  }

  const selected = readSelectedServerId();
  if (selected) {
    return selected;
  }

  const fromConfig = getClientRuntimeConfig()?.serverId;
  if (!fromConfig?.trim()) {
    throw new Error(ARCHITECTURE_SERVER_ID_REQUIRED);
  }

  return requireServerId(fromConfig);
}

/** Shard ativo da sessão — runtime config (pós-login) ou deploy (/config/client). */
export function resolveActiveServerId(): string {
  const fromConfig = getClientRuntimeConfig()?.serverId?.trim();
  if (fromConfig) {
    return requireServerId(fromConfig);
  }
  return resolveLoginServerId();
}

/** Garante que o runtime do cliente usa o shard escolhido (char select ou login). */
export function applyLoginServerIdToRuntime(serverId: string): string {
  const scoped = requireServerId(serverId);
  const definition = resolveServerInstanceDefinition(scoped);
  const config = getClientRuntimeConfig();
  if (config) {
    setClientRuntimeConfig({
      ...config,
      serverId: scoped,
      serverName: definition.displayName,
    });
  }
  return scoped;
}
