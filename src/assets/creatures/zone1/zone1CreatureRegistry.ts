import type { CreatureManifest } from '../../../shared/assets/creatureManifest.js';
import { ZONE1_ALLEY_CREATURES, type Zone1CreatureId } from '../../../shared/world/zone1MonsterSpawns.js';

import aranhaManifest from './aranha/manifest.json' with { type: 'json' };
import caoSelvagemManifest from './cao_selvagem/manifest.json' with { type: 'json' };
import corvoManifest from './corvo/manifest.json' with { type: 'json' };
import morcegoManifest from './morcego/manifest.json' with { type: 'json' };
import ratoManifest from './rato/manifest.json' with { type: 'json' };

export const ZONE1_ID = 'zone1' as const;

export type Zone1CreatureFolder =
  | 'corvo'
  | 'rato'
  | 'cao_selvagem'
  | 'morcego'
  | 'aranha';

export type Zone1CreatureRegistryEntry = {
  readonly creatureId: Zone1CreatureId;
  readonly folder: Zone1CreatureFolder;
  readonly manifest: CreatureManifest;
};

/** Mapeia IDs de gameplay (crow, rat…) → pasta + manifesto da zona. */
export const ZONE1_CREATURE_REGISTRY: readonly Zone1CreatureRegistryEntry[] = [
  { creatureId: 'crow', folder: 'corvo', manifest: corvoManifest as CreatureManifest },
  { creatureId: 'rat', folder: 'rato', manifest: ratoManifest as CreatureManifest },
  { creatureId: 'wild_dog', folder: 'cao_selvagem', manifest: caoSelvagemManifest as CreatureManifest },
  { creatureId: 'bat', folder: 'morcego', manifest: morcegoManifest as CreatureManifest },
  { creatureId: 'spider', folder: 'aranha', manifest: aranhaManifest as CreatureManifest },
];

const registryByCreatureId = new Map<Zone1CreatureId, Zone1CreatureRegistryEntry>(
  ZONE1_CREATURE_REGISTRY.map((entry) => [entry.creatureId, entry]),
);

export function resolveZone1CreatureEntry(creatureId: string): Zone1CreatureRegistryEntry | null {
  if (!ZONE1_ALLEY_CREATURES.includes(creatureId as Zone1CreatureId)) {
    return null;
  }
  return registryByCreatureId.get(creatureId as Zone1CreatureId) ?? null;
}

export function listZone1CreatureIds(): readonly Zone1CreatureId[] {
  return ZONE1_ALLEY_CREATURES;
}
