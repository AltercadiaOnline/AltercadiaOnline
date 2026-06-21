import { isSupabaseReady } from './supabaseAuth.js';

export type AuthBootstrapPhase = 'idle' | 'pending' | 'ready' | 'failed';

type AuthBootstrapListener = () => void;

type AuthBootstrapGlobalState = {
  phase: AuthBootstrapPhase;
  failureMessage: string | null;
  bootstrapPromise: Promise<boolean> | null;
  listeners: Set<AuthBootstrapListener>;
};

type GlobalWithAuthBootstrap = typeof globalThis & {
  __ALTERCADIA_AUTH_BOOTSTRAP__?: AuthBootstrapGlobalState;
};

function getState(): AuthBootstrapGlobalState {
  const globalRef = globalThis as GlobalWithAuthBootstrap;
  if (!globalRef.__ALTERCADIA_AUTH_BOOTSTRAP__) {
    globalRef.__ALTERCADIA_AUTH_BOOTSTRAP__ = {
      phase: 'idle',
      failureMessage: null,
      bootstrapPromise: null,
      listeners: new Set(),
    };
  }
  return globalRef.__ALTERCADIA_AUTH_BOOTSTRAP__;
}

function notifyListeners(): void {
  for (const listener of getState().listeners) {
    listener();
  }
}

export function getAuthBootstrapPhase(): AuthBootstrapPhase {
  return getState().phase;
}

export function getAuthBootstrapFailureMessage(): string | null {
  return getState().failureMessage;
}

export function subscribeAuthBootstrap(listener: AuthBootstrapListener): () => void {
  const state = getState();
  state.listeners.add(listener);
  listener();
  return () => state.listeners.delete(listener);
}

export function markAuthBootstrapPending(): void {
  const state = getState();
  state.phase = 'pending';
  state.failureMessage = null;
  notifyListeners();
}

export function markAuthBootstrapReady(): void {
  const state = getState();
  state.phase = 'ready';
  state.failureMessage = null;
  notifyListeners();
}

export function markAuthBootstrapFailed(message: string): void {
  const state = getState();
  state.phase = 'failed';
  state.failureMessage = message;
  notifyListeners();
}

/** Registra a promise do bootstrap principal (main.ts / appScreens). */
export function registerAuthBootstrapPromise(promise: Promise<unknown>): void {
  const state = getState();
  markAuthBootstrapPending();
  state.bootstrapPromise = promise.then(
    () => isSupabaseReady(),
    () => false,
  );
  void state.bootstrapPromise.then((ready) => {
    if (ready) {
      markAuthBootstrapReady();
      return;
    }
    if (getState().phase === 'pending') {
      markAuthBootstrapFailed('Falha ao preparar autenticação.');
    }
  });

  void sleep(60_000).then(() => {
    if (getState().phase !== 'pending') return;
    if (isSupabaseReady()) {
      markAuthBootstrapReady();
      return;
    }
    markAuthBootstrapFailed('Autenticação demorou demais. Recarregue a página (Ctrl+F5) e tente de novo.');
  });
}

const AUTH_BOOTSTRAP_WAIT_MS = 45_000;
const AUTH_BOOTSTRAP_POLL_MS = 200;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Aguarda Supabase Auth — evita clique no login antes do bootstrap terminar. */
export async function waitForAuthBootstrapReady(): Promise<boolean> {
  if (isSupabaseReady()) return true;

  const deadline = Date.now() + AUTH_BOOTSTRAP_WAIT_MS;

  while (Date.now() < deadline) {
    if (isSupabaseReady()) return true;

    const bootstrapPromise = getState().bootstrapPromise;
    if (bootstrapPromise) {
      const remaining = Math.max(deadline - Date.now(), 0);
      const ready = await Promise.race([
        bootstrapPromise,
        sleep(Math.min(remaining, AUTH_BOOTSTRAP_POLL_MS)).then(() => false),
      ]);
      if (ready || isSupabaseReady()) return true;
      continue;
    }

    await sleep(AUTH_BOOTSTRAP_POLL_MS);
  }

  return isSupabaseReady();
}

export function resetAuthBootstrapStateForTests(): void {
  const globalRef = globalThis as GlobalWithAuthBootstrap;
  globalRef.__ALTERCADIA_AUTH_BOOTSTRAP__ = {
    phase: 'idle',
    failureMessage: null,
    bootstrapPromise: null,
    listeners: new Set(),
  };
}
