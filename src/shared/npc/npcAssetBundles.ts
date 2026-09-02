import { resolveNpcArchetypeId } from './resolveNpcArchetypeId.js';
export const NPC_ASSET_PUBLIC_BASE = '/assets/npcs';

export type NpcAssetBundleConfig = {
  readonly bundleFolder: string;
  readonly metadataUrl: string;
  /** Tamanho do frame south (metadata character.size) — colisão + âncora. */
  readonly frameWidth: number;
  readonly frameHeight: number;
};

/**
 * NPCs com bundle top-down em public/assets/npcs/{pasta}/…
 * `bundleFolder` = pasta que contém metadata.json + pastas de rotations.
 * Chave = id do NPC no npcRegistry.
 * frame* = character.size do metadata (fonte da colisão).
 */
export const NPC_ASSET_BUNDLES: Readonly<Record<string, NpcAssetBundleConfig>> = {
  anciao_cael: {
    bundleFolder: 'anciao_npc/npc_anciao_cael_asset',
    metadataUrl: `${NPC_ASSET_PUBLIC_BASE}/anciao_npc/npc_anciao_cael_asset/metadata.json`,
    frameWidth: 80,
    frameHeight: 80,
  },
  mestre_trilhas: {
    bundleFolder: 'npc_mestre_trilhas/npc.mestredastrilhas',
    metadataUrl: `${NPC_ASSET_PUBLIC_BASE}/npc_mestre_trilhas/npc.mestredastrilhas/metadata.json`,
    frameWidth: 68,
    frameHeight: 68,
  },
  /** ID de protocolo permanece `treinador_zeno`; display = Treinadora Zena. */
  treinador_zeno: {
    bundleFolder: 'treinador_zeno_npc/treinadora_zena',
    metadataUrl: `${NPC_ASSET_PUBLIC_BASE}/treinador_zeno_npc/treinadora_zena/metadata.json`,
    frameWidth: 80,
    frameHeight: 80,
  },
  ferreiro: {
    bundleFolder: 'ferreiro_npc',
    metadataUrl: `${NPC_ASSET_PUBLIC_BASE}/ferreiro_npc/metadata.json`,
    frameWidth: 100,
    frameHeight: 100,
  },
  vendedor: {
    bundleFolder: 'comerciamente_npc',
    metadataUrl: `${NPC_ASSET_PUBLIC_BASE}/comerciamente_npc/metadata.json`,
    frameWidth: 96,
    frameHeight: 96,
  },
  alquimista: {
    bundleFolder: 'alquimista_npc',
    metadataUrl: `${NPC_ASSET_PUBLIC_BASE}/alquimista_npc/metadata.json`,
    frameWidth: 104,
    frameHeight: 104,
  },
  banqueiro: {
    bundleFolder: 'banqueiro_npc',
    metadataUrl: `${NPC_ASSET_PUBLIC_BASE}/banqueiro_npc/metadata.json`,
    frameWidth: 96,
    frameHeight: 96,
  },
  mercenario: {
    bundleFolder: 'mercenario_npc/npc.mercenario',
    metadataUrl: `${NPC_ASSET_PUBLIC_BASE}/mercenario_npc/npc.mercenario/metadata.json`,
    frameWidth: 80,
    frameHeight: 80,
  },
  contrabandista: {
    bundleFolder: 'npc_contrabandista',
    metadataUrl: `${NPC_ASSET_PUBLIC_BASE}/npc_contrabandista/metadata.json`,
    frameWidth: 68,
    frameHeight: 68,
  },
  receptador: {
    bundleFolder: 'npc_receptador',
    metadataUrl: `${NPC_ASSET_PUBLIC_BASE}/npc_receptador/metadata.json`,
    frameWidth: 68,
    frameHeight: 68,
  },
  operario_linha4: {
    bundleFolder: 'npc_operario_linha4',
    metadataUrl: `${NPC_ASSET_PUBLIC_BASE}/npc_operario_linha4/metadata.json`,
    frameWidth: 68,
    frameHeight: 68,
  },
  humano_1: {
    bundleFolder: 'npc_humano_1',
    metadataUrl: `${NPC_ASSET_PUBLIC_BASE}/npc_humano_1/metadata.json`,
    frameWidth: 68,
    frameHeight: 68,
  },
  humano_2: {
    bundleFolder: 'npc_humano_2',
    metadataUrl: `${NPC_ASSET_PUBLIC_BASE}/npc_humano_2/metadata.json`,
    frameWidth: 68,
    frameHeight: 68,
  },
  mercador_rua: {
    bundleFolder: 'npc_mercador_rua',
    metadataUrl: `${NPC_ASSET_PUBLIC_BASE}/npc_mercador_rua/metadata.json`,
    frameWidth: 68,
    frameHeight: 68,
  },
  tecnico_manutencao: {
    bundleFolder: 'npc_tecnico_manutencao',
    metadataUrl: `${NPC_ASSET_PUBLIC_BASE}/npc_tecnico_manutencao/metadata.json`,
    frameWidth: 68,
    frameHeight: 68,
  },
  membro_gang_rosa: {
    bundleFolder: 'npc_membro_gang_rosa',
    metadataUrl: `${NPC_ASSET_PUBLIC_BASE}/npc_membro_gang_rosa/metadata.json`,
    frameWidth: 68,
    frameHeight: 68,
  },
  cao_robo: {
    bundleFolder: 'cão_robo_npc',
    metadataUrl: `${NPC_ASSET_PUBLIC_BASE}/cão_robo_npc/metadata.json`,
    frameWidth: 68,
    frameHeight: 68,
  },
  /** Mesmo PNG Construct (48×48) — mecânicas distintas no registry. */
  computador_arena: {
    bundleFolder: 'computador_npc',
    metadataUrl: `${NPC_ASSET_PUBLIC_BASE}/computador_npc/metadata.json`,
    frameWidth: 48,
    frameHeight: 48,
  },
  computador_marketplace: {
    bundleFolder: 'computador_npc',
    metadataUrl: `${NPC_ASSET_PUBLIC_BASE}/computador_npc/metadata.json`,
    frameWidth: 48,
    frameHeight: 48,
  },
  computador_zona1: {
    bundleFolder: 'computador_npc',
    metadataUrl: `${NPC_ASSET_PUBLIC_BASE}/computador_npc/metadata.json`,
    frameWidth: 48,
    frameHeight: 48,
  },
  computador_zona1a: {
    bundleFolder: 'computador_npc',
    metadataUrl: `${NPC_ASSET_PUBLIC_BASE}/computador_npc/metadata.json`,
    frameWidth: 48,
    frameHeight: 48,
  },
  computador_zona1b: {
    bundleFolder: 'computador_npc',
    metadataUrl: `${NPC_ASSET_PUBLIC_BASE}/computador_npc/metadata.json`,
    frameWidth: 48,
    frameHeight: 48,
  },
  computador_zona1c: {
    bundleFolder: 'computador_npc',
    metadataUrl: `${NPC_ASSET_PUBLIC_BASE}/computador_npc/metadata.json`,
    frameWidth: 48,
    frameHeight: 48,
  },
  /** Púlpito PvP rankeado — PNG em props (`pulpito.pvp.png`) espelhado no bundle. */
  combate_pvp: {
    bundleFolder: 'pulpito_pvp',
    metadataUrl: `${NPC_ASSET_PUBLIC_BASE}/pulpito_pvp/metadata.json`,
    frameWidth: 32,
    frameHeight: 32,
  },
} as const;

/** Terminais sem bundle PNG dedicado — footprint de colisão. */
export const NPC_TERMINAL_FRAME_SIZE: Readonly<
  Record<string, { readonly width: number; readonly height: number }>
> = {};


export function hasNpcAssetBundle(npcId: string): boolean {
  return resolveNpcArchetypeId(npcId) in NPC_ASSET_BUNDLES;
}

export function listNpcAssetBundleIds(): readonly string[] {
  return Object.keys(NPC_ASSET_BUNDLES);
}

export function getNpcAssetFrameSize(
  npcId: string,
): { readonly width: number; readonly height: number } | null {
  const bundle = NPC_ASSET_BUNDLES[resolveNpcArchetypeId(npcId)];
  if (bundle) {
    return { width: bundle.frameWidth, height: bundle.frameHeight };
  }
  return NPC_TERMINAL_FRAME_SIZE[resolveNpcArchetypeId(npcId)] ?? null;
}

/** Tamanho de colisão = footprint nos pés (não o PNG inteiro). */
export function resolveNpcCollisionSize(
  npcId: string,
): { readonly width: number; readonly height: number } {
  const archetypeId = resolveNpcArchetypeId(npcId);
  const frame = getNpcAssetFrameSize(archetypeId) ?? { width: 35, height: 54 };
  // Terminais / computadores / púlpito — footprint = frame, sem shrink de humanoide.
  if (archetypeId in NPC_TERMINAL_FRAME_SIZE || archetypeId.startsWith('computador_') || archetypeId === 'combate_pvp') {
    return frame;
  }
  // Humanoides: círculo implícito nos pés — footprint mínimo (~½ tile).
  return {
    width: Math.max(12, Math.round(frame.width * 0.16)),
    height: Math.max(10, Math.round(frame.height * 0.12)),
  };
}
