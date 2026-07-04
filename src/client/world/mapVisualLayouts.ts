import { CITY_01_ID } from '../../shared/world/maps/city01.js';
import { CITY_01_MAP_TILES } from '../../shared/world/maps/city01LayoutConstants.js';
import { FARM_ZONE_01_ID } from '../../shared/world/maps/farm_zone_01.js';
import { DESIGN_CONFIG } from '../../config/designConstants.js';
import { isTiledMapEnabled } from '../../config/tiledMapManifest.js';
import { getMapDefinition, type MapId } from '../../shared/world/mapRegistry.js';
import { buildCity01PlaceholderScene, type City01PlaceholderScene } from './city01PlaceholderLayout.js';
import { buildFarmZone01VisualLayout, type FarmZone01VisualLayout } from './farmZone01VisualLayout.js';
import type { VisualLandmark, VisualStructure } from './city01VisualLayout.js';
import { isPhaserRenderPipelineReady } from '../app/bridge/renderLayerBridge.js';
import { isPhaserCanvasProceduralFallback } from '../phaser/phaserCanvasFallback.js';

export type MapVisualLayout = {
  readonly mapId: MapId;
  readonly tiles: readonly (readonly { readonly kind: string; readonly landmarkId: string | null }[])[];
  readonly landmarks: readonly VisualLandmark[];
  readonly structures: readonly VisualStructure[];
  readonly placeholderScene: City01PlaceholderScene | null;
  readonly showDebugLayout: boolean;
  readonly mapTilesWide: number;
  readonly mapTilesHigh: number;
  readonly tileSize: number;
  readonly background: string;
};

/**
 * Mapas com export Tiled (`public/assets/map_mund/`) — sem placeholder nem escala legada.
 * Posição/tamanho vêm só do JSON (MapLoader Phaser).
 */
function buildTiledAuthoritativeVisualLayout(mapId: MapId): MapVisualLayout {
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
    tiles: [],
    landmarks: [],
    structures: [],
    placeholderScene: null,
    showDebugLayout: false,
    mapTilesWide,
    mapTilesHigh,
    tileSize,
    background: 'transparent',
  };
}

function phaserOwnsTiledGround(mapId: MapId): boolean {
  return (
    isTiledMapEnabled(mapId)
    && isPhaserRenderPipelineReady()
    && !isPhaserCanvasProceduralFallback(mapId)
  );
}

export function buildMapVisualLayout(mapId: MapId): MapVisualLayout {
  // Mapas Tiled: chão no Phaser. Se o pipeline ainda não montou, canvas usa layout procedural
  // (evita tela preta — bug que bloqueou produção por semanas).
  if (phaserOwnsTiledGround(mapId)) {
    return buildTiledAuthoritativeVisualLayout(mapId);
  }

  if (mapId === FARM_ZONE_01_ID) {
    const farm = buildFarmZone01VisualLayout();
    return {
      mapId,
      tiles: farm.tiles,
      landmarks: farm.landmarks,
      structures: [],
      placeholderScene: null,
      showDebugLayout: false,
      mapTilesWide: farm.mapTilesWide,
      mapTilesHigh: farm.mapTilesHigh,
      tileSize: farm.tileSize,
      background: '#0a0b0f',
    };
  }

  const placeholderScene = buildCity01PlaceholderScene();
  return {
    mapId: CITY_01_ID,
    tiles: [],
    landmarks: placeholderScene.entities.map((entity) => ({
      id: entity.assetKey,
      label: entity.label,
      kind: entity.assetKey === 'portal_north' ? ('portal' as const) : ('structure' as const),
      tileX: entity.tileX + Math.floor(entity.tileW / 2),
      tileY: entity.tileY + Math.floor(entity.tileH / 2),
    })),
    structures: placeholderScene.entities.map((entity) => ({
      id: entity.assetKey,
      label: entity.label,
      tileX: entity.tileX,
      tileY: entity.tileY,
      tileW: entity.tileW,
      tileH: entity.tileH,
    })),
    placeholderScene,
    showDebugLayout: placeholderScene.showDebugLayout,
    mapTilesWide: CITY_01_MAP_TILES,
    mapTilesHigh: CITY_01_MAP_TILES,
    tileSize: placeholderScene.tileSize,
    background: '#0a0b0f',
  };
}

export type { FarmZone01VisualLayout };
