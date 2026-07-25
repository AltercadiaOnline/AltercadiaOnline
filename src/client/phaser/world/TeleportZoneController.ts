// @ts-nocheck
/**
 * Avalia zonas de teletransporte por frame — dispara uma vez por entrada (edge trigger).
 */
export class TeleportZoneController {
    zones;
    onEnter;
    activePortalId = null;
    constructor(zones, onEnter) {
        this.zones = [...zones];
        this.onEnter = onEnter;
    }
    reset() {
        this.activePortalId = null;
    }
    update(playerPosition) {
        const hit = this.zones.find((zone) => zone.intersectsPlayer(playerPosition));
        if (!hit) {
            this.activePortalId = null;
            return;
        }
        if (this.activePortalId === hit.portalId)
            return;
        this.activePortalId = hit.portalId;
        this.onEnter(hit.portalId);
    }
    destroy() {
        this.activePortalId = null;
    }
}
