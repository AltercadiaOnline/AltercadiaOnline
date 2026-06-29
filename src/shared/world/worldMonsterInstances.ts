import type { MapId } from './mapRegistry.js';
import type { MonsterRegistryEntry } from './monsterRegistry.js';
import { clearDefeatedMonsters, isMonsterDefeated, markMonsterDefeated } from './defeatedMonsterState.js';
import { buildZone1TestMonsterInstances } from './zone1MonsterSpawns.js';

const activeById = new Map<string, MonsterRegistryEntry>();
let zone1Seeded = false;

function seedZone1Monsters(): void {
  if (zone1Seeded) return;
  for (const entry of buildZone1TestMonsterInstances()) {
    activeById.set(entry.id, entry);
  }
  zone1Seeded = true;
}

export function resetWorldMonsterInstances(): void {
  activeById.clear();
  clearDefeatedMonsters();
  zone1Seeded = false;
}

export function ensureWorldMonsterInstances(): void {
  seedZone1Monsters();
}

export function getWorldMonsterEntry(monsterId: string): MonsterRegistryEntry | undefined {
  ensureWorldMonsterInstances();
  const entry = activeById.get(monsterId);
  if (!entry || isMonsterDefeated(monsterId)) return undefined;
  return entry;
}

export function getActiveMonstersForMap(mapId: MapId): readonly MonsterRegistryEntry[] {
  ensureWorldMonsterInstances();
  return [...activeById.values()].filter(
    (entry) => entry.mapId === mapId && !isMonsterDefeated(entry.id),
  );
}

/** Remove do array ativo após vitória — não reaparece na sessão. */
export function removeActiveWorldMonster(monsterId: string): void {
  activeById.delete(monsterId);
  markMonsterDefeated(monsterId);
}

export function listActiveWorldMonsterIds(mapId: MapId): readonly string[] {
  return getActiveMonstersForMap(mapId).map((entry) => entry.id);
}

/** Substitui criaturas de um mapa com lista autoritativa do servidor (state-sync). */
export function syncServerWorldCreatures(
  mapId: MapId,
  entries: readonly MonsterRegistryEntry[],
): void {
  ensureWorldMonsterInstances();
  for (const [id, entry] of activeById) {
    if (entry.mapId === mapId) {
      activeById.delete(id);
    }
  }
  for (const entry of entries) {
    if (entry.mapId !== mapId || isMonsterDefeated(entry.id)) continue;
    activeById.set(entry.id, entry);
  }
}
