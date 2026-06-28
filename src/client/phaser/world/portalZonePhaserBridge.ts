import type { TeleportZoneEnterHandler } from './TeleportZoneController.js';

let portalZoneEnterHandler: TeleportZoneEnterHandler | null = null;

export function setPortalZonePhaserTriggerHandler(handler: TeleportZoneEnterHandler | null): void {
  portalZoneEnterHandler = handler;
}

export function notifyPortalZonePhaserTrigger(portalId: string): void {
  portalZoneEnterHandler?.(portalId);
}
