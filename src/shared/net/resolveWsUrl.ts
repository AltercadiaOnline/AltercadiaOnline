/**
 * Resolve a URL do WebSocket do jogo.
 * Prioridade: `gameWsUrl` de GET /config/client → mesma origem (npm run dev / monólito).
 */
export function resolveGameWsUrl(
  location: Location = window.location,
  configuredWsUrl?: string | null,
): string {
  const trimmed = configuredWsUrl?.trim();
  if (trimmed) return trimmed;

  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${location.host}/ws`;
}
