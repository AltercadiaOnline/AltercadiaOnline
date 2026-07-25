import type { mountHudRuntime, unmountHudRuntime } from './mountHudRuntime.js';

export type HudRuntimeApi = {
  readonly mount: typeof mountHudRuntime;
  readonly unmount: typeof unmountHudRuntime;
};

type GlobalWithHudRuntime = typeof globalThis & {
  __ALTERCADIA_HUD_RUNTIME__?: HudRuntimeApi;
};

/** API registada pelo ui-runtime (mesmo React) — usada por main.js ao entrar no mundo. */
export function getRegisteredHudRuntimeApi(): HudRuntimeApi | null {
  return (globalThis as GlobalWithHudRuntime).__ALTERCADIA_HUD_RUNTIME__ ?? null;
}

export function registerHudRuntimeApi(api: HudRuntimeApi): void {
  (globalThis as GlobalWithHudRuntime).__ALTERCADIA_HUD_RUNTIME__ = api;
}
