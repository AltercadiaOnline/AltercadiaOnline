// @ts-nocheck
export function registerGlobalChatController(controller) {
    globalThis.__ALTERCADIA_GLOBAL_CHAT_CONTROLLER__ = controller;
}
export function getGlobalChatController() {
    return globalThis.__ALTERCADIA_GLOBAL_CHAT_CONTROLLER__ ?? null;
}
export function clearGlobalChatController() {
    delete globalThis.__ALTERCADIA_GLOBAL_CHAT_CONTROLLER__;
}
