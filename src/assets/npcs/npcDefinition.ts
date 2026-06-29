/**
 * Manifesto SSOT — definições visuais e físicas de NPCs (sprites PNG).
 * Gameplay (posição, ações, diálogo) permanece em npcRegistry.ts.
 */
import { DESIGN_NPC_DIMENSIONS } from '../../config/spriteDimensions.js';

export const NPC_ASSET_PUBLIC_BASE = '/assets/npcs';

export type NpcDefinition = {
  readonly width: number;
  readonly height: number;
  readonly isCollidable: boolean;
  readonly animationSpeed: number;
};

export type NpcAssetBundleConfig = {
  readonly bundleFolder: string;
  readonly metadataUrl: string;
};

/**
 * NPCs com bundle top-down em public/assets/npcs/{pasta}/metadata.json.
 * Chave = id do NPC no npcRegistry.
 */
export const NPC_ASSET_BUNDLES: Readonly<Record<string, NpcAssetBundleConfig>> = {
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
} as const;

export const NPC_DEFINITION_REGISTRY: Readonly<Record<string, NpcDefinition>> = {
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
} as const;

export type NpcDefinitionId = keyof typeof NPC_DEFINITION_REGISTRY;

const definitionRegistry = NPC_DEFINITION_REGISTRY as Record<string, NpcDefinition>;

export function getNpcDefinition(npcId: string): NpcDefinition | null {
  return definitionRegistry[npcId] ?? null;
}

export function hasNpcAssetBundle(npcId: string): boolean {
  return npcId in NPC_ASSET_BUNDLES;
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

export function listNpcAssetBundleIds(): readonly string[] {
  return Object.keys(NPC_ASSET_BUNDLES);
}

export function isNpcDefinitionCollidable(npcId: string): boolean {
  const def = getNpcDefinition(npcId);
  return def?.isCollidable ?? true;
}

export function resolveNpcAnimationSpeed(npcId: string): number {
  return getNpcDefinition(npcId)?.animationSpeed ?? 0;
}
