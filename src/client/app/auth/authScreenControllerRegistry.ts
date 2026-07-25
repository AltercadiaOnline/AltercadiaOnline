// @ts-nocheck
export function registerAuthScreenController(controller) {
    globalThis.__ALTERCADIA_AUTH_SCREEN_CONTROLLER__ = controller;
}
export function getAuthScreenController() {
    return globalThis.__ALTERCADIA_AUTH_SCREEN_CONTROLLER__ ?? null;
}
