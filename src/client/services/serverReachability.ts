const HEALTH_TIMEOUT_MS = 4000;

/** Verifica se o servidor HTTP do jogo está respondendo (mesma origem). */
export async function isGameServerReachable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
    const response = await fetch('/health', { signal: controller.signal });
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}
