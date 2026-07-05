import city01PhaserJson from './maps/city01PhaserMap.json' with { type: 'json' };
import farmZone01PhaserJson from './maps/farmZone01PhaserMap.json' with { type: 'json' };
import type { MapId } from '../shared/world/mapRegistry.js';
import { parseTiledWorldCollision } from '../shared/world/parseTiledWorldCollision.js';
import { setWorldCollisionObstacles } from '../shared/world/worldCollisionRegistry.js';
import type { PhaserReadyTiledMap } from './tiledMapJson.js';

const PHASER_MAP_BY_ID: Partial<Record<MapId, PhaserReadyTiledMap>> = {
  city_01: city01PhaserJson as PhaserReadyTiledMap,
  farm_zone_01: farmZone01PhaserJson as PhaserReadyTiledMap,
};

/** Pré-carrega obstáculos colidíveis dos artefatos Phaser (cliente e servidor). */
export function bootstrapWorldCollisionFromTiledMaps(): void {
  for (const [mapId, phaserMap] of Object.entries(PHASER_MAP_BY_ID)) {
    const obstacles = parseTiledWorldCollision(mapId as MapId, phaserMap);
    setWorldCollisionObstacles(mapId as MapId, obstacles);
  }
}

bootstrapWorldCollisionFromTiledMaps();
