import type { WorldPoint } from '../../../shared/world/playerEntity.js';
import type { TeleportZone } from './TeleportZone.js';

export type TeleportZoneEnterHandler = (portalId: string) => void;

/**
 * Avalia zonas de teletransporte por frame — dispara uma vez por entrada (edge trigger).
 */
export class TeleportZoneController {
  private readonly zones: TeleportZone[];

  private readonly onEnter: TeleportZoneEnterHandler;

  private activePortalId: string | null = null;

  constructor(zones: readonly TeleportZone[], onEnter: TeleportZoneEnterHandler) {
    this.zones = [...zones];
    this.onEnter = onEnter;
  }

  reset(): void {
    this.activePortalId = null;
  }

  update(playerPosition: WorldPoint): void {
    const hit = this.zones.find((zone) => zone.intersectsPlayer(playerPosition));
    if (!hit) {
      this.activePortalId = null;
      return;
    }

    if (this.activePortalId === hit.portalId) return;

    this.activePortalId = hit.portalId;
    this.onEnter(hit.portalId);
  }

  destroy(): void {
    this.activePortalId = null;
  }
}
