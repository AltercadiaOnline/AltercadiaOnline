/** Manifesto de bundles top-down — SSOT para NpcSpriteLoader e npcDefinition. */
export const NPC_ASSET_PUBLIC_BASE = '/assets/npcs';

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

export function hasNpcAssetBundle(npcId: string): boolean {
  return npcId in NPC_ASSET_BUNDLES;
}

export function listNpcAssetBundleIds(): readonly string[] {
  return Object.keys(NPC_ASSET_BUNDLES);
}
