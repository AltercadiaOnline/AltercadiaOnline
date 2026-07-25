// @ts-nocheck
let portalZoneEnterHandler = null;
export function setPortalZonePhaserTriggerHandler(handler) {
    portalZoneEnterHandler = handler;
}
export function notifyPortalZonePhaserTrigger(portalId) {
    portalZoneEnterHandler?.(portalId);
}
