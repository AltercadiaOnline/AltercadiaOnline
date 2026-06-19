import { getClientRuntimeConfig } from '../runtime/clientRuntimeConfig.js';
import { ARCHITECTURE_SERVER_ID_REQUIRED, requireServerId } from '../../shared/supabase/characterServerScope.js';

/** Shard ativo — sempre o deploy atual (/config/client → SERVER_ID). */
export function resolveLoginServerId(): string {
  const fromConfig = getClientRuntimeConfig()?.serverId;
  if (!fromConfig?.trim()) {
    throw new Error(ARCHITECTURE_SERVER_ID_REQUIRED);
  }
  return requireServerId(fromConfig);
}

/** Alias — shard vem do gateway, nunca de sessionStorage. */
export function resolveActiveServerId(): string {
  return resolveLoginServerId();
}

/** No-op — shard imutável por deploy; mantido para compatibilidade. */
export function clearPendingLoginServerId(): void {}

/** No-op — shard imutável por deploy; mantido para compatibilidade. */
export function clearSelectedServerId(): void {}

/** No-op — mantido para compatibilidade de imports. */
export function applyLoginServerIdToRuntime(serverId: string): string {
  return requireServerId(serverId);
}
