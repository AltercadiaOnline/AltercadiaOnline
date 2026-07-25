// @ts-nocheck
import { windowManager } from '../../ui/WindowManager.js';
export function openHudWindow(windowId) {
    windowManager.open(windowId);
}
export function closeHudWindow(windowId) {
    windowManager.close(windowId);
}
export function toggleHudHub() {
    windowManager.toggle('hub');
}
export function closeHudHub() {
    windowManager.close('hub');
}
