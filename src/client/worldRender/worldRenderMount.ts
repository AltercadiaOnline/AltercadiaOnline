// @ts-nocheck
/** Host DOM do motor de cena (Construct). */
export const WORLD_MOUNT_ROOT_ID = 'world-mount-root';
export const GAME_RENDER_HOST_ID = 'game-render-host';
export function resolveWorldMountHost() {
    return document.getElementById(WORLD_MOUNT_ROOT_ID);
}
export function revealWorldMountHost() {
    const host = resolveWorldMountHost();
    if (!host)
        return;
    host.classList.remove('hidden');
    host.toggleAttribute('aria-hidden', false);
}
export function hideWorldMountHost() {
    const host = resolveWorldMountHost();
    if (!host)
        return;
    host.classList.add('hidden');
    host.toggleAttribute('aria-hidden', true);
}
