// @ts-nocheck
import { GAME_CONFIG } from '../../game/constants/GameConfig.js';
import { isTiledNpcObjectLayer, isTiledSpawnObjectLayer } from './tiledMapLayers.js';
import { resolveTiledNpcCollidable, resolveTiledNpcId, resolveTiledObjectFeetPosition, } from './tiledMapNpc.js';
import { resolveTiledPlayerSpawn, resolveTiledPlayerSpawnFromLayer } from './tiledMapSpawn.js';
/** Extrai spawn do jogador e NPCs das object layers Tiled — sem Phaser. */
export function parseTiledMapPlacements(mapId, rawMap) {
    const issues = [];
    const tileSize = rawMap.tilewidth ?? GAME_CONFIG.TILE_SIZE;
    const npcs = new Map();
    let playerSpawn = null;
    let spawnLayerFound = false;
    let npcLayerFound = false;
    for (const layer of rawMap.layers ?? []) {
        if (layer.type !== 'objectgroup')
            continue;
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
        if (!isTiledNpcObjectLayer(layer.name))
            continue;
        npcLayerFound = true;
        for (const object of layer.objects ?? []) {
            if (object.visible === false)
                continue;
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
