import { GAME_CONFIG } from '../../game/constants/GameConfig.js';
import type { MapId } from './mapRegistry.js';
import {
  isTiledMapObjectCollidable,
  resolveTiledMapObjectUid,
  type TiledObjectPropertySource,
} from './tiledMapObject.js';
import {
  isTiledCollisionObjectLayer,
  isTiledNpcObjectLayer,
  isTiledSpawnObjectLayer,
} from './tiledMapLayers.js';
import {
  resolveTiledNpcCollidable,
  resolveTiledNpcId,
  resolveTiledObjectFeetPosition,
} from './tiledMapNpc.js';
import type { WorldCollisionObstacle } from './worldCollisionObstacle.js';
import { resolveTiledObjectFootCollisionHitbox } from './tiledObjectCollisionHitbox.js';

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

function resolveNpcCollisionHitbox(
  object: RawTiledObject,
  tileSize: number,
): WorldCollisionObstacle['hitbox'] {
  const feet = resolveTiledObjectFeetPosition(object, tileSize);
  const width = tileSize;
  const height = tileSize;
  return {
    x: feet.worldX - width / 2,
    y: feet.worldY - height,
    width,
    height,
  };
}

function pushCollidableObject(
  obstacles: WorldCollisionObstacle[],
  mapId: MapId,
  layerName: string,
  object: RawTiledObject,
  tileSize: number,
  kind: WorldCollisionObstacle['kind'],
): void {
  if (!isTiledMapObjectCollidable(object)) return;

  const hitbox = kind === 'npc'
    ? resolveNpcCollisionHitbox(object, tileSize)
    : resolveTiledObjectFootCollisionHitbox(object, tileSize);

  obstacles.push({
    id: resolveTiledMapObjectUid(mapId, layerName, object),
    kind,
    hitbox,
  });
}

/** Extrai obstáculos colidíveis das object layers Tiled — sem Phaser. */
export function parseTiledWorldCollision(
  mapId: MapId,
  rawMap: RawTiledMap,
): readonly WorldCollisionObstacle[] {
  const tileSize = rawMap.tilewidth ?? GAME_CONFIG.TILE_SIZE;
  const obstacles: WorldCollisionObstacle[] = [];

  for (const layer of rawMap.layers ?? []) {
    if (layer.type !== 'objectgroup') continue;
    if (isTiledSpawnObjectLayer(layer.name)) continue;

    if (isTiledNpcObjectLayer(layer.name)) {
      for (const object of layer.objects ?? []) {
        if (object.visible === false) continue;
        const npcId = resolveTiledNpcId(object);
        if (!npcId) continue;
        if (!resolveTiledNpcCollidable(object)) continue;
        pushCollidableObject(obstacles, mapId, layer.name, object, tileSize, 'npc');
      }
      continue;
    }

    if (isTiledCollisionObjectLayer(layer.name)) {
      for (const object of layer.objects ?? []) {
        if (object.visible === false) continue;
        pushCollidableObject(obstacles, mapId, layer.name, object, tileSize, 'tiled_prop');
      }
      continue;
    }

    for (const object of layer.objects ?? []) {
      if (object.visible === false) continue;
      pushCollidableObject(obstacles, mapId, layer.name, object, tileSize, 'tiled_prop');
    }
  }

  return obstacles;
}
