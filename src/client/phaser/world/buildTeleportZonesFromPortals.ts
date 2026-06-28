import { DESIGN_CONFIG } from '../../../config/designConstants.js';
import type { Portal } from '../../../shared/world/portals.js';
import { tileToWorldPixel } from '../../../shared/world/portals.js';
import { TeleportZone } from './TeleportZone.js';

/** Converte portal declarativo em zona de overlap em pixels do mundo. */
export function buildTeleportZonesFromPortals(
  portals: readonly Portal[],
  tileSize: number = DESIGN_CONFIG.TILE.SIZE,
): TeleportZone[] {
  return portals.map((portal) => {
    const origin = tileToWorldPixel(portal.tileX, portal.tileY, tileSize);
    return new TeleportZone({
      portalId: portal.id,
      targetMapId: portal.targetMapId,
      targetX: portal.targetPosition.x,
      targetY: portal.targetPosition.y,
      zoneBounds: {
        x: origin.x,
        y: origin.y,
        width: portal.tileW * tileSize,
        height: portal.tileH * tileSize,
      },
    });
  });
}
