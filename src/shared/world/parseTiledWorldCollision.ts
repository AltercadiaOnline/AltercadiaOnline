// @ts-nocheck
import { GAME_CONFIG } from '../../game/constants/GameConfig.js';
import { isTiledMapObjectCollidable, resolveTiledMapObjectUid, } from './tiledMapObject.js';
import { isTiledCollisionObjectLayer, isTiledNpcObjectLayer, isTiledSpawnObjectLayer, } from './tiledMapLayers.js';
import { resolveTiledNpcCollidable, resolveTiledNpcId, resolveTiledObjectFeetPosition, } from './tiledMapNpc.js';
import { resolveTiledObjectFootCollisionHitbox } from './tiledObjectCollisionHitbox.js';
function resolveNpcCollisionHitbox(object, tileSize) {
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
function pushCollidableObject(obstacles, mapId, layerName, object, tileSize, kind) {
    if (!isTiledMapObjectCollidable(object))
        return;
    const hitbox = kind === 'npc'
        ? resolveNpcCollisionHitbox(object, tileSize)
        : resolveTiledObjectFootCollisionHitbox(object, tileSize);
    obstacles.push({
        id: resolveTiledMapObjectUid(mapId, layerName, object),
        kind,
        hitbox,
    });
}
/** Percorre object layers com `collidable: true` (inclui `npcs` e props com gid). */
export function forEachTiledCollidableObject(rawMap, visit) {
    for (const layer of rawMap.layers ?? []) {
        if (layer.type !== 'objectgroup')
            continue;
        if (isTiledSpawnObjectLayer(layer.name))
            continue;
        if (isTiledNpcObjectLayer(layer.name)) {
            for (const object of layer.objects ?? []) {
                if (object.visible === false)
                    continue;
                const npcId = resolveTiledNpcId(object);
                if (!npcId)
                    continue;
                if (!resolveTiledNpcCollidable(object))
                    continue;
                visit({ layerName: layer.name, object, kind: 'npc' });
            }
            continue;
        }
        if (isTiledCollisionObjectLayer(layer.name)) {
            for (const object of layer.objects ?? []) {
                if (object.visible === false)
                    continue;
                if (!isTiledMapObjectCollidable(object))
                    continue;
                visit({ layerName: layer.name, object, kind: 'tiled_prop' });
            }
            continue;
        }
        for (const object of layer.objects ?? []) {
            if (object.visible === false)
                continue;
            if (!isTiledMapObjectCollidable(object))
                continue;
            visit({ layerName: layer.name, object, kind: 'tiled_prop' });
        }
    }
}
/** Extrai obstáculos colidíveis das object layers Tiled — sem Phaser. */
export function parseTiledWorldCollision(mapId, rawMap) {
    const tileSize = rawMap.tilewidth ?? GAME_CONFIG.TILE_SIZE;
    const obstacles = [];
    forEachTiledCollidableObject(rawMap, ({ layerName, object, kind }) => {
        pushCollidableObject(obstacles, mapId, layerName, object, tileSize, kind);
    });
    return obstacles;
}
