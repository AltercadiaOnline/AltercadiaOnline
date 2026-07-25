import { isWorldSessionReady } from '../world/worldSessionGate.js';

const FRAME_SETTLE_MS = 120;

/** Espera o handshake world-login-result (ou timeout). */
export function waitForWorldSessionReady(timeoutMs = 25_000): Promise<boolean> {
  if (isWorldSessionReady()) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const startedAt = performance.now();
    const timer = window.setInterval(() => {
      if (isWorldSessionReady()) {
        window.clearInterval(timer);
        resolve(true);
        return;
      }
      if (performance.now() - startedAt >= timeoutMs) {
        window.clearInterval(timer);
        resolve(false);
      }
    }, 40);
  });
}

/** Dois frames + folga curta — deixa Construct/overlay pintar antes de revelar. */
export function waitForWorldPaintSettle(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.setTimeout(resolve, FRAME_SETTLE_MS);
      });
    });
  });
}
