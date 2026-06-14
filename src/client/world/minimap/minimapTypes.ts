import type { MapId } from '../../../shared/world/mapRegistry.js';

export type MinimapMarkerKind = 'player' | 'npc' | 'monster';

export type MinimapMarker = {
  readonly kind: MinimapMarkerKind;
  readonly tileX: number;
  readonly tileY: number;
  readonly color?: string;
};

export type MinimapViewportRect = {
  readonly minTileX: number;
  readonly minTileY: number;
  readonly maxTileX: number;
  readonly maxTileY: number;
};

export type MinimapDestinationTile = {
  readonly tileX: number;
  readonly tileY: number;
};

export type MinimapSnapshot = {
  readonly mapId: MapId;
  readonly tilesWide: number;
  readonly tilesHigh: number;
  readonly playerTileX: number;
  readonly playerTileY: number;
  readonly markers: readonly MinimapMarker[];
  readonly viewport?: MinimapViewportRect;
  /** Destino do click-to-move no minimapa. */
  readonly destination?: MinimapDestinationTile;
};

export type MinimapTerrain = {
  readonly mapId: MapId;
  readonly tilesWide: number;
  readonly tilesHigh: number;
  /** Cores hex por tile — indexadas [y][x]. */
  readonly colors: readonly (readonly string[])[];
};
