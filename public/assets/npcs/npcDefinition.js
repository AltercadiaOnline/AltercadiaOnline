/**
 * Manifesto SSOT — definições visuais e físicas de NPCs (sprites PNG).
 * Gameplay (posição, ações, diálogo) permanece em npcRegistry.ts.
 */
export const NPC_ASSET_PUBLIC_BASE = '/assets/npcs';
import { GAME_CONFIG } from '../../game/constants/GameConfig.js';
export const NPC_DEFINITION_REGISTRY = {
    anciao_cael: {
        sprite: 'npc_anciao.png',
        width: GAME_CONFIG.TILE_SIZE,
        height: GAME_CONFIG.TILE_SIZE,
        isCollidable: true,
        animationSpeed: 0.1,
    },
    treinador_zeno: {
        sprite: 'npc_treinador.png',
        width: GAME_CONFIG.TILE_SIZE,
        height: GAME_CONFIG.TILE_SIZE,
        isCollidable: true,
        animationSpeed: 0.15,
    },
};
const registry = NPC_DEFINITION_REGISTRY;
/** URLs públicas — chave = id do NPC no npcRegistry. */
export const NPC_SPRITE_IMAGE_URLS = Object.fromEntries(Object.entries(NPC_DEFINITION_REGISTRY).map(([id, def]) => [
    id,
    `${NPC_ASSET_PUBLIC_BASE}/${def.sprite}`,
]));
export function getNpcDefinition(npcId) {
    return registry[npcId] ?? null;
}
export function resolveNpcSpriteImageUrl(npcId) {
    return NPC_SPRITE_IMAGE_URLS[npcId] ?? null;
}
export function listNpcDefinitionIds() {
    return Object.keys(NPC_DEFINITION_REGISTRY);
}
/** Colisão de tile — padrão true para NPCs legados sem definição. */
export function isNpcDefinitionCollidable(npcId) {
    const def = getNpcDefinition(npcId);
    return def?.isCollidable ?? true;
}
export function resolveNpcAnimationSpeed(npcId) {
    return getNpcDefinition(npcId)?.animationSpeed ?? 0;
}
