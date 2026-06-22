import type { PublicClientConfig } from '../../shared/publicClientConfig.js';

type GlobalWithClientRuntimeConfig = typeof globalThis & {
  __ALTERCADIA_CLIENT_RUNTIME_CONFIG__?: PublicClientConfig | null;
};

/** Config pública em singleton — ui-runtime.js e main.js compartilham o mesmo snapshot. */
export function setClientRuntimeConfig(config: PublicClientConfig): void {
  (globalThis as GlobalWithClientRuntimeConfig).__ALTERCADIA_CLIENT_RUNTIME_CONFIG__ = config;
}

export function getClientRuntimeConfig(): PublicClientConfig | null {
  return (globalThis as GlobalWithClientRuntimeConfig).__ALTERCADIA_CLIENT_RUNTIME_CONFIG__ ?? null;
}
