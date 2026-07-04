import { GAME_CONFIG } from '../../game/constants/GameConfig.js';
import type { MapId } from './mapRegistry.js';
import { isTiledNpcObjectLayer, isTiledSpawnObjectLayer } from './tiledMapLayers.js';
import {
  resolveTiledNpcCollidable,
  resolveTiledNpcId,
  resolveTiledObjectFeetPosition,
} from './tiledMapNpc.js';
import type { TiledMapPlacements, TiledNpcPlacement } from './tiledMapPlacements.js';
import { resolveTiledPlayerSpawn, resolveTiledPlayerSpawnFromLayer } from './tiledMapSpawn.js';
import type { TiledObjectPropertySource } from './tiledMapObject.js';

type RawTiledObject = TiledObjectPropertySource & {
  readonly type?: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly visible?: boolean;
};

type RawTiledLayer = {
  readonly name: string;
  readonly type: string;
  readonly objects?: readonly RawTiledObject[];
};

type RawTiledMap = {
  readonly tilewidth?: number;
  readonly tileheight?: number;
  readonly layers?: readonly RawTiledLayer[];
};

export type ParseTiledMapPlacementsResult = {
  readonly placements: TiledMapPlacements;
  readonly issues: readonly string[];
  readonly spawnLayerFound: boolean;
  readonly npcLayerFound: boolean;
};

/** Extrai spawn do jogador e NPCs das object layers Tiled — sem Phaser. */
export function parseTiledMapPlacements(
  mapId: MapId,
  rawMap: RawTiledMap,
): ParseTiledMapPlacementsResult {
  const issues: string[] = [];
  const tileSize = rawMap.tilewidth ?? GAME_CONFIG.TILE_SIZE;
  const npcs = new Map<string, TiledNpcPlacement>();
  let playerSpawn = null;
  let spawnLayerFound = false;
  let npcLayerFound = false;

  for (const layer of rawMap.layers ?? []) {
    if (layer.type !== 'objectgroup') continue;

    if (isTiledSpawnObjectLayer(layer.name)) {
      spawnLayerFound = true;
      const layerObjects = layer.objects ?? [];
      for (const object of layerObjects) {
        const spawn = resolveTiledPlayerSpawn(object);
        if (spawn) {
          playerSpawn = spawn;
          break;
        }
      }
      if (!playerSpawn) {
        playerSpawn = resolveTiledPlayerSpawnFromLayer(layerObjects);
      }
      continue;
    }

    if (!isTiledNpcObjectLayer(layer.name)) continue;

    npcLayerFound = true;
    for (const object of layer.objects ?? []) {
      if (object.visible === false) continue;

      const npcId = resolveTiledNpcId(object);
      if (!npcId) {
        issues.push(`Objeto sem id na camada "npcs" (defina name/type = id do NPC_REGISTRY).`);
        continue;
      }

      const feet = resolveTiledObjectFeetPosition(object, tileSize);
      npcs.set(npcId, {
        npcId,
        worldX: feet.worldX,
        worldY: feet.worldY,
        tileX: feet.tileX,
        tileY: feet.tileY,
        collidable: resolveTiledNpcCollidable(object),
      });
    }
  }

  return {
    placements: { playerSpawn, npcs },
    issues,
    spawnLayerFound,
    npcLayerFound,
  };
}
