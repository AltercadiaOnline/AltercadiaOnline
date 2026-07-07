import type { Zone1CreatureId } from '../world/zone1MonsterSpawns.js';

/** Raiz dos bundles top-down PixelLab v3 das criaturas da Zona 1. */
export const ZONE1_TOPDOWN_BASE = '/assets/creatures/zone1_top_down_mundo';

export type TopDownCreatureFacing =
  | 'south'
  | 'south-east'
  | 'east'
  | 'north-east'
  | 'north'
  | 'north-west'
  | 'west'
  | 'south-west';

type Zone1TopDownEntry = {
  /**
   * Caminho da pasta `rotations` relativo a ZONE1_TOPDOWN_BASE.
   * Os nomes de pasta variam por export (não confiar no campo `folder` do metadata).
   */
  readonly rotationsBase: string;
  /** Resolução nativa do frame (px) — vem do metadata `character.size`. */
  readonly frameSize: number;
};

/** Mapa autoritativo creatureId → bundle top-down em disco (public/assets/creatures). */
const ZONE1_TOPDOWN_ENTRIES: Readonly<Record<Zone1CreatureId, Zone1TopDownEntry>> = {
  crow: {
    rotationsBase: 'corvo/corvo_topdown_test/rotations',
    frameSize: 60,
  },
  rat: {
    rotationsBase: 'rato/rato_topdown/rotations',
    frameSize: 36,
  },
  wild_dog: {
    rotationsBase: 'cao_selvagem/cachorro_topdown_test/rotations',
    frameSize: 48,
  },
  bat: {
    rotationsBase: 'morcego/morcego_topdown_test/rotations',
    frameSize: 60,
  },
  spider: {
    rotationsBase: 'aranha/aranha_topdown_test/Top-down_2d_game_character_sprite/rotations',
    frameSize: 56,
  },
};

function getEntry(creatureId: string): Zone1TopDownEntry | null {
  return ZONE1_TOPDOWN_ENTRIES[creatureId as Zone1CreatureId] ?? null;
}

export function hasZone1TopDownBundle(creatureId: string): boolean {
  return getEntry(creatureId) !== null;
}

/** URL pública de uma rotação top-down (default: sul — pose idle canônica). */
export function resolveZone1TopDownRotationUrl(
  creatureId: string,
  facing: TopDownCreatureFacing = 'south',
): string | null {
  const entry = getEntry(creatureId);
  if (!entry) return null;
  return `${ZONE1_TOPDOWN_BASE}/${entry.rotationsBase}/${facing}.png`;
}

/** Nome do frame no atlas JSONArray (`npm run generate-assets`). */
export function resolveZone1TopDownAtlasFrameId(
  creatureId: string,
  facing: TopDownCreatureFacing = 'south',
): string | null {
  const entry = getEntry(creatureId);
  if (!entry) return null;
  return `${entry.rotationsBase.replace(/\//g, '__')}__${facing}`;
}

export function resolveZone1TopDownFrameSize(creatureId: string): number | null {
  return getEntry(creatureId)?.frameSize ?? null;
}
