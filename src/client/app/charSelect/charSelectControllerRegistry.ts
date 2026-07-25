// @ts-nocheck
export function registerCharSelectScreenController(controller) {
    globalThis.__ALTERCADIA_CHAR_SELECT_CONTROLLER__ = controller;
}
export function getCharSelectScreenController() {
    return globalThis.__ALTERCADIA_CHAR_SELECT_CONTROLLER__ ?? null;
}
