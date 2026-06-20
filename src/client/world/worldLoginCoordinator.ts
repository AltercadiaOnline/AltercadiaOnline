import { isWorldSessionReady } from './worldSessionGate.js';

const WORLD_LOGIN_RETRY_MS = 3500;

let retryTimer: ReturnType<typeof setInterval> | null = null;

/** Reenvia world-login até o servidor confirmar (desbloqueia WASD). */
export function scheduleWorldLoginRetry(request: () => void | Promise<void>): void {
  clearWorldLoginRetry();

  retryTimer = setInterval(() => {
    if (isWorldSessionReady()) {
      clearWorldLoginRetry();
      return;
    }
    void request();
  }, WORLD_LOGIN_RETRY_MS);
}

export function clearWorldLoginRetry(): void {
  if (retryTimer !== null) {
    clearInterval(retryTimer);
    retryTimer = null;
  }
}
