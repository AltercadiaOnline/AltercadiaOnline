import { ZONE1_ALLEY_CREATURES } from '../../../shared/world/zone1MonsterSpawns.js';
const aranhaManifest = {
    id: 'aranha_z1',
    displayName: 'Aranha',
    sprites: { idle: 'idle.png', attack: 'attack.png' },
};
const caoSelvagemManifest = {
    id: 'cao_z1',
    displayName: 'Cão Selvagem',
    sprites: { idle: 'idle.png', attack: 'attack.png' },
};
const corvoManifest = {
    id: 'corvo_z1',
    displayName: 'Corvo',
    sprites: { idle: 'idle.png', attack: 'attack.png' },
};
const morcegoManifest = {
    id: 'morcego_z1',
    displayName: 'Morcego',
    sprites: { idle: 'idle.png', attack: 'attack.png' },
};
const ratoManifest = {
    id: 'rato_z1',
    displayName: 'Rato',
    sprites: { idle: 'idle.png', attack: 'attack.png' },
};
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
