/** @deprecated Importe de `./managers/mapManager.js` — re-export de compatibilidade. */
export {
  MapManager,
  DEFAULT_MAP_ID,
  MAP_REGISTRY,
  getMapDefinition,
  type MapId,
  type MapSceneHost,
  type LoadMapOptions,
} from './managers/mapManager.js';

export {
  TILE_SIZE,
  MAP_TILES,
  TileType,
  type TileId,
  generateMapData,
  generateMapData as createMapData,
  isTileBlocking,
  tileAt,
  canWalkAt,
} from '../shared/world/worldMap.js';

export { canPlayerWalkAt } from '../shared/world/movement.js';
