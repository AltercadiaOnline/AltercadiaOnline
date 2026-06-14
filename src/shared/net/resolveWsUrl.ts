/**
 * Resolve a URL do WebSocket do jogo a partir do host atual.
 * Produção (HTTPS) → wss://; desenvolvimento local → ws://.
 */
export function resolveGameWsUrl(location: Location = window.location): string {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${location.host}/ws`;
}
