import type { PublicClientConfig } from '../../shared/publicClientConfig.js';

let cachedConfig: PublicClientConfig | null = null;

export function setClientRuntimeConfig(config: PublicClientConfig): void {
  cachedConfig = config;
}

export function getClientRuntimeConfig(): PublicClientConfig | null {
  return cachedConfig;
}
