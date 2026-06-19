import type { CreatureManifest } from '../../../shared/assets/creatureManifest.js';
import { ZONE1_ALLEY_CREATURES, type Zone1CreatureId } from '../../../shared/world/zone1MonsterSpawns.js';

const aranhaManifest = {
  id: 'aranha_z1',
  displayName: 'Aranha',
  sprites: { idle: 'idle.png', attack: 'attack.png' },
} satisfies CreatureManifest;

const caoSelvagemManifest = {
  id: 'cao_z1',
  displayName: 'Cão Selvagem',
  sprites: { idle: 'idle.png', attack: 'attack.png' },
} satisfies CreatureManifest;

const corvoManifest = {
  id: 'corvo_z1',
  displayName: 'Corvo',
  sprites: { idle: 'idle.png', attack: 'attack.png' },
} satisfies CreatureManifest;

const morcegoManifest = {
  id: 'morcego_z1',
  displayName: 'Morcego',
  sprites: { idle: 'idle.png', attack: 'attack.png' },
} satisfies CreatureManifest;

const ratoManifest = {
  id: 'rato_z1',
  displayName: 'Rato',
  sprites: { idle: 'idle.png', attack: 'attack.png' },
} satisfies CreatureManifest;

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
  { creatureId: 'crow', folder: 'corvo', manifest: corvoManifest },
  { creatureId: 'rat', folder: 'rato', manifest: ratoManifest },
  { creatureId: 'wild_dog', folder: 'cao_selvagem', manifest: caoSelvagemManifest },
  { creatureId: 'bat', folder: 'morcego', manifest: morcegoManifest },
  { creatureId: 'spider', folder: 'aranha', manifest: aranhaManifest },
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
