// @ts-nocheck
import { GAME_CONFIG } from '../../game/constants/GameConfig.js';
/** Objetos com `gid` no Tiled usam (x, y) no canto inferior-esquerdo do tile. */
export function resolveTiledObjectTopLeftRect(object, tileSize = GAME_CONFIG.TILE_SIZE) {
    const width = object.width > 0 ? object.width : tileSize;
    const height = object.height > 0 ? object.height : tileSize;
    const isGid = typeof object.gid === 'number' && object.gid > 0;
    if (isGid) {
        return {
            x: object.x,
            y: object.y - height,
            width,
            height,
        };
    }
    return {
        x: object.x,
        y: object.y,
        width,
        height,
    };
}
/** Pés do collider — espelha origem (0.5, 1) dos sprites do MapLoader. */
export function resolveTiledColliderFeetAnchor(object, tileSize = GAME_CONFIG.TILE_SIZE) {
    const width = object.width > 0 ? object.width : tileSize;
    const height = object.height > 0 ? object.height : tileSize;
    const isPoint = object.width <= 0 && object.height <= 0;
    const isGid = typeof object.gid === 'number' && object.gid > 0;
    if (isPoint) {
        return {
            feetX: object.x,
            feetY: object.y,
            width: tileSize,
            height: tileSize,
        };
    }
    if (isGid) {
        return {
            feetX: object.x + width / 2,
            feetY: object.y,
            width,
            height,
        };
    }
    return {
        feetX: object.x + width / 2,
        feetY: object.y + height,
        width,
        height,
    };
}
/** Retângulo completo do objeto Tiled (canto superior-esquerdo). */
export function resolveTiledObjectCollisionHitbox(object, tileSize = GAME_CONFIG.TILE_SIZE) {
    return resolveTiledObjectTopLeftRect(object, tileSize);
}
/**
 * Metade inferior do objeto — espelha MapLoader.applyStaticCollision (Phaser body).
 * Permite o jogador passar visualmente “atrás” da parte superior de casas/postes.
 */
export function resolveTiledObjectFootCollisionHitbox(object, tileSize = GAME_CONFIG.TILE_SIZE) {
    const full = resolveTiledObjectCollisionHitbox(object, tileSize);
    const collisionHeight = Math.max(1, full.height * 0.5);
    return {
        x: full.x,
        y: full.y + full.height - collisionHeight,
        width: full.width,
        height: collisionHeight,
    };
}
/** Ajusta body Arcade para colidir na base do objeto (props) ou tile inteiro (NPC). */
export function applyTiledArcadeColliderBody(body, width, height, kind = 'prop') {
    if (kind === 'npc') {
        body.setSize(width, height, true);
        body.setOffset(-width / 2, -height);
        return;
    }
    const collisionHeight = Math.max(1, height * 0.5);
    body.setSize(width, collisionHeight, true);
    body.setOffset(-width / 2, -height);
}
