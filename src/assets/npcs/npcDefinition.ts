/**
 * Manifesto SSOT — definições visuais e físicas de NPCs (sprites PNG).
 * Gameplay (posição, ações, diálogo) permanece em npcRegistry.ts.
 */
import {
  hasNpcAssetBundle,
  listNpcAssetBundleIds,
  NPC_ASSET_BUNDLES,
  NPC_ASSET_PUBLIC_BASE,
  getNpcAssetFrameSize,
  resolveNpcCollisionSize,
  type NpcAssetBundleConfig,
} from '../../shared/npc/npcAssetBundles.js';

export {
  hasNpcAssetBundle,
  listNpcAssetBundleIds,
  NPC_ASSET_BUNDLES,
  NPC_ASSET_PUBLIC_BASE,
  getNpcAssetFrameSize,
  resolveNpcCollisionSize,
  type NpcAssetBundleConfig,
};

export type NpcDefinition = {
  readonly width: number;
  readonly height: number;
  readonly isCollidable: boolean;
  readonly animationSpeed: number;
};

function defFromBundle(
  npcId: string,
  animationSpeed: number,
  isCollidable = true,
): NpcDefinition {
  const size = resolveNpcCollisionSize(npcId);
  return {
    width: size.width,
    height: size.height,
    isCollidable,
    animationSpeed,
  };
}

export const NPC_DEFINITION_REGISTRY: Readonly<Record<string, NpcDefinition>> = {
  anciao_cael: defFromBundle('anciao_cael', 0.08),
  mestre_trilhas: defFromBundle('mestre_trilhas', 0.08),
  ferreiro: defFromBundle('ferreiro', 0.1),
  vendedor: defFromBundle('vendedor', 0.12),
  alquimista: defFromBundle('alquimista', 0.1),
  banqueiro: defFromBundle('banqueiro', 0.1),
  mercenario: defFromBundle('mercenario', 0.11),
  treinador_zeno: defFromBundle('treinador_zeno', 0.1),
  // instrutor_refraction (Kael) — fora do spawn até entrada oficial
  computador_marketplace: defFromBundle('computador_marketplace', 0, false),
  computador_arena: defFromBundle('computador_arena', 0, false),
  combate_pvp: defFromBundle('combate_pvp', 0, false),
  computador_zona1: defFromBundle('computador_zona1', 0, false),
} as const;

export type NpcDefinitionId = keyof typeof NPC_DEFINITION_REGISTRY;

const definitionRegistry = NPC_DEFINITION_REGISTRY as Record<string, NpcDefinition>;

export function getNpcDefinition(npcId: string): NpcDefinition | null {
  return definitionRegistry[npcId] ?? null;
}

/** @deprecated Bundles usam metadata — retorna null; use NpcSpriteLoader. */
export function resolveNpcSpriteImageUrl(npcId: string): string | null {
  const bundle = NPC_ASSET_BUNDLES[npcId];
  if (!bundle) return null;
  return bundle.metadataUrl;
}

export function listNpcDefinitionIds(): readonly string[] {
  return Object.keys(NPC_DEFINITION_REGISTRY);
}

export function isNpcDefinitionCollidable(npcId: string): boolean {
  const def = getNpcDefinition(npcId);
  return def?.isCollidable ?? true;
}

export function resolveNpcAnimationSpeed(npcId: string): number {
  return getNpcDefinition(npcId)?.animationSpeed ?? 0;
}
