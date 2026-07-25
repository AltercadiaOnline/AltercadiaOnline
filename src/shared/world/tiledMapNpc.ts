// @ts-nocheck
import { GAME_CONFIG } from '../../game/constants/GameConfig.js';
import { readTiledObjectProperty } from './tiledMapObject.js';
import { isTiledMapObjectCollidable } from './tiledMapObject.js';
import { worldPixelToTile } from './portals.js';
/** Identificador canônico do NPC — `name`, `type` ou propriedade `npcId`. */
export function resolveTiledNpcId(object) {
    const name = object.name?.trim();
    if (name && name.length > 0)
        return name;
    const type = object.type?.trim();
    if (type && type.length > 0)
        return type;
    const npcId = readTiledObjectProperty(object, 'npcId');
    if (typeof npcId === 'string' && npcId.trim().length > 0) {
        return npcId.trim();
    }
    return null;
}
/** Pés do NPC/objeto — pontos Tiled usam (x,y) direto; retângulos usam centro-base. */
export function resolveTiledObjectFeetPosition(object, tileSize = GAME_CONFIG.TILE_SIZE) {
    const isPoint = object.width <= 0 && object.height <= 0;
    const worldX = isPoint
        ? object.x
        : object.x + (object.width > 0 ? object.width : tileSize) / 2;
    const worldY = isPoint
        ? object.y
        : object.y + (object.height > 0 ? object.height : tileSize);
    const tile = worldPixelToTile(worldX, worldY, tileSize);
    return {
        worldX,
        worldY,
        tileX: tile.tileX,
        tileY: tile.tileY,
    };
}
export function resolveTiledNpcCollidable(object) {
    return isTiledMapObjectCollidable(object);
}
