// @ts-nocheck
/** API registada pelo ui-runtime (mesmo React) — usada por main.js ao entrar no mundo. */
export function getRegisteredHudRuntimeApi() {
    return globalThis.__ALTERCADIA_HUD_RUNTIME__ ?? null;
}
export function registerHudRuntimeApi(api) {
    globalThis.__ALTERCADIA_HUD_RUNTIME__ = api;
}
