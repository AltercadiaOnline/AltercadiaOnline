import { DESIGN_CONFIG } from '../../config/designConstants.js';
import { getMapDefinition, type MapId } from '../../shared/world/mapRegistry.js';

/** Layout lógico mínimo — cena visual = Construct (sem paint canvas). */
export type MapVisualLayout = {
  readonly mapId: MapId;
  readonly mapTilesWide: number;
  readonly mapTilesHigh: number;
  readonly tileSize: number;
};

export function buildMapVisualLayout(mapId: MapId): MapVisualLayout {
  const definition = getMapDefinition(mapId);
  const tileSize = definition?.tileSize ?? DESIGN_CONFIG.TILE.SIZE;
  const mapTilesWide = definition
    ? Math.max(1, Math.ceil(definition.pixelWidth() / tileSize))
    : DESIGN_CONFIG.MAP.MAX_TILES_WIDTH;
  const mapTilesHigh = definition
    ? Math.max(1, Math.ceil(definition.pixelHeight() / tileSize))
    : DESIGN_CONFIG.MAP.MAX_TILES_HEIGHT;

  return {
    mapId,
    mapTilesWide,
    mapTilesHigh,
    tileSize,
  };
}
