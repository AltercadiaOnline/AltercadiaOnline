import { ZONE1_ALLEY_CREATURES } from '../../../shared/world/zone1MonsterSpawns.js';
import aranhaManifest from './aranha/manifest.json' with { type: 'json' };
import caoSelvagemManifest from './cao_selvagem/manifest.json' with { type: 'json' };
import corvoManifest from './corvo/manifest.json' with { type: 'json' };
import morcegoManifest from './morcego/manifest.json' with { type: 'json' };
import ratoManifest from './rato/manifest.json' with { type: 'json' };
export const ZONE1_ID = 'zone1';
/** Mapeia IDs de gameplay (crow, rat…) → pasta + manifesto da zona. */
export const ZONE1_CREATURE_REGISTRY = [
    { creatureId: 'crow', folder: 'corvo', manifest: corvoManifest },
    { creatureId: 'rat', folder: 'rato', manifest: ratoManifest },
    { creatureId: 'wild_dog', folder: 'cao_selvagem', manifest: caoSelvagemManifest },
    { creatureId: 'bat', folder: 'morcego', manifest: morcegoManifest },
    { creatureId: 'spider', folder: 'aranha', manifest: aranhaManifest },
];
const registryByCreatureId = new Map(ZONE1_CREATURE_REGISTRY.map((entry) => [entry.creatureId, entry]));
export function resolveZone1CreatureEntry(creatureId) {
    if (!ZONE1_ALLEY_CREATURES.includes(creatureId)) {
        return null;
    }
    return registryByCreatureId.get(creatureId) ?? null;
}
export function listZone1CreatureIds() {
    return ZONE1_ALLEY_CREATURES;
}
