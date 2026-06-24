import type { PublicClientConfig } from '../publicClientConfig.js';

export function isLocalMonolithDevHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

export function resolveLocalMonolithGameHttpUrl(location: Pick<Location, 'origin'>): string {
  return location.origin.replace(/\/+$/, '');
}

export function resolveLocalMonolithGameWsUrl(
  location: Pick<Location, 'protocol' | 'host'>,
): string {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${location.host}/ws`;
}

/**
 * Em dev local (npm run dev), o front e o servidor compartilham a mesma origem.
 * Ignora GAME_HTTP_URL / GAME_WS_URL da .env apontando para Railway.
 */
export function applyLocalMonolithDevClientConfig(
  config: PublicClientConfig,
  location: Pick<Location, 'hostname' | 'origin' | 'protocol' | 'host'>,
): PublicClientConfig {
  if (!isLocalMonolithDevHost(location.hostname)) {
    return config;
  }

  const gameHttpUrl = resolveLocalMonolithGameHttpUrl(location);
  const gameWsUrl = resolveLocalMonolithGameWsUrl(location);

  if (config.gameHttpUrl === gameHttpUrl && config.gameWsUrl === gameWsUrl) {
    return config;
  }

  console.info('[Net] Dev local — servidor monólito em', gameHttpUrl);

  return {
    ...config,
    gameHttpUrl,
    gameWsUrl,
  };
}
