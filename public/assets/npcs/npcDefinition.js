/**
 * Manifesto SSOT — definições visuais e físicas de NPCs (sprites PNG).
 * Gameplay (posição, ações, diálogo) permanece em npcRegistry.ts.
 */
import { DESIGN_NPC_DIMENSIONS } from '../../config/spriteDimensions.js?v=7c4b8b9';
import { hasNpcAssetBundle, listNpcAssetBundleIds, NPC_ASSET_BUNDLES, NPC_ASSET_PUBLIC_BASE, } from '../../shared/npc/npcAssetBundles.js?v=7c4b8b9';
export { hasNpcAssetBundle, listNpcAssetBundleIds, NPC_ASSET_BUNDLES, NPC_ASSET_PUBLIC_BASE, };
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
export function isNpcDefinitionCollidable(npcId) {
    const def = getNpcDefinition(npcId);
    return def?.isCollidable ?? true;
}
export function resolveNpcAnimationSpeed(npcId) {
    return getNpcDefinition(npcId)?.animationSpeed ?? 0;
}
