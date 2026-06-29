/**
 * Manifesto SSOT — definições visuais e físicas de NPCs (sprites PNG).
 * Gameplay (posição, ações, diálogo) permanece em npcRegistry.ts.
 */
import { DESIGN_NPC_DIMENSIONS } from '../../config/spriteDimensions.js';
export const NPC_ASSET_PUBLIC_BASE = '/assets/npcs';
/**
 * NPCs com bundle top-down em public/assets/npcs/{pasta}/metadata.json.
 * Chave = id do NPC no npcRegistry.
 */
export const NPC_ASSET_BUNDLES = {
    anciao_cael: {
        bundleFolder: 'anciao_npc',
        metadataUrl: `${NPC_ASSET_PUBLIC_BASE}/anciao_npc/metadata.json`,
    },
    mestre_trilhas: {
        bundleFolder: 'anciao_npc',
        metadataUrl: `${NPC_ASSET_PUBLIC_BASE}/anciao_npc/metadata.json`,
    },
    ferreiro: {
        bundleFolder: 'ferreiro_npc',
        metadataUrl: `${NPC_ASSET_PUBLIC_BASE}/ferreiro_npc/metadata.json`,
    },
    vendedor: {
        bundleFolder: 'comerciamente_npc',
        metadataUrl: `${NPC_ASSET_PUBLIC_BASE}/comerciamente_npc/metadata.json`,
    },
    alquimista: {
        bundleFolder: 'alquimista_npc',
        metadataUrl: `${NPC_ASSET_PUBLIC_BASE}/alquimista_npc/metadata.json`,
    },
    banqueiro: {
        bundleFolder: 'banqueiro_npc',
        metadataUrl: `${NPC_ASSET_PUBLIC_BASE}/banqueiro_npc/metadata.json`,
    },
};
export const NPC_DEFINITION_REGISTRY = {
    anciao_cael: {
        width: DESIGN_NPC_DIMENSIONS.width,
        height: DESIGN_NPC_DIMENSIONS.height,
        isCollidable: true,
        animationSpeed: 0.08,
    },
    mestre_trilhas: {
        width: DESIGN_NPC_DIMENSIONS.width,
        height: DESIGN_NPC_DIMENSIONS.height,
        isCollidable: true,
        animationSpeed: 0.08,
    },
    ferreiro: {
        width: DESIGN_NPC_DIMENSIONS.width,
        height: DESIGN_NPC_DIMENSIONS.height,
        isCollidable: true,
        animationSpeed: 0.1,
    },
    vendedor: {
        width: DESIGN_NPC_DIMENSIONS.width,
        height: DESIGN_NPC_DIMENSIONS.height,
        isCollidable: true,
        animationSpeed: 0.12,
    },
    alquimista: {
        width: DESIGN_NPC_DIMENSIONS.width,
        height: DESIGN_NPC_DIMENSIONS.height,
        isCollidable: true,
        animationSpeed: 0.1,
    },
    banqueiro: {
        width: DESIGN_NPC_DIMENSIONS.width,
        height: DESIGN_NPC_DIMENSIONS.height,
        isCollidable: true,
        animationSpeed: 0.1,
    },
};
const definitionRegistry = NPC_DEFINITION_REGISTRY;
export function getNpcDefinition(npcId) {
    return definitionRegistry[npcId] ?? null;
}
export function hasNpcAssetBundle(npcId) {
    return npcId in NPC_ASSET_BUNDLES;
}
/** @deprecated Bundles usam metadata — retorna null; use NpcSpriteLoader. */
export function resolveNpcSpriteImageUrl(npcId) {
    const bundle = NPC_ASSET_BUNDLES[npcId];
    if (!bundle)
        return null;
    return bundle.metadataUrl;
}
export function listNpcDefinitionIds() {
    return Object.keys(NPC_DEFINITION_REGISTRY);
}
export function listNpcAssetBundleIds() {
    return Object.keys(NPC_ASSET_BUNDLES);
}
export function isNpcDefinitionCollidable(npcId) {
    const def = getNpcDefinition(npcId);
    return def?.isCollidable ?? true;
}
export function resolveNpcAnimationSpeed(npcId) {
    return getNpcDefinition(npcId)?.animationSpeed ?? 0;
}
