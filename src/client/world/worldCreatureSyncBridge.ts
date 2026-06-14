import type { MapId } from '../../shared/world/mapRegistry.js';
import {
  creatureSnapshotToMonsterEntry,
  isValidWorldCreatureSnapshot,
  type WorldCreatureSnapshot,
} from '../../shared/world/worldCreatureSync.js';
import {
  ensureWorldMonsterInstances,
  getActiveMonstersForMap,
  syncServerWorldCreatures,
} from '../../shared/world/worldMonsterInstances.js';
import type { MonsterRegistryEntry } from '../../shared/world/monsterRegistry.js';
import { isVisualDebugModeEnabled } from '../debug/visualDebugMode.js';
import { getActiveMapTileSize } from '../../shared/world/activeMapTileSize.js';

type WorldCreatureSyncListener = (mapId: MapId) => void;

let listener: WorldCreatureSyncListener | null = null;
const authoritativeByMap = new Map<string, readonly WorldCreatureSnapshot[]>();

export function setWorldCreatureSyncListener(next: WorldCreatureSyncListener | null): void {
  listener = next;
}

export function getAuthoritativeCreatureSnapshots(mapId: MapId): readonly WorldCreatureSnapshot[] {
  return authoritativeByMap.get(mapId) ?? [];
}

export function hasAuthoritativeCreatureSnapshots(mapId: MapId): boolean {
  const stored = authoritativeByMap.get(mapId);
  return stored !== undefined && stored.length > 0;
}

export function resolveMapIdFromCreatureSnapshots(
  snapshots: readonly WorldCreatureSnapshot[],
): MapId | null {
  const first = snapshots[0];
  return first ? (first.mapId as MapId) : null;
}

/** Lista para render — prioriza snapshots autoritativos; offline usa seed local. */
export function resolveCreaturesForMapRender(mapId: MapId): readonly MonsterRegistryEntry[] {
  const authoritative = getAuthoritativeCreatureSnapshots(mapId);
  if (authoritative.length > 0) {
    return authoritative.map(creatureSnapshotToMonsterEntry);
  }
  ensureWorldMonsterInstances();
  return getActiveMonstersForMap(mapId);
}

function logCreatureIntegrityAudit(
  mapId: string,
  snapshots: readonly WorldCreatureSnapshot[],
): void {
  if (!isVisualDebugModeEnabled() && snapshots.length === 0) return;

  const tileSize = getActiveMapTileSize();
  console.groupCollapsed(
    `[CreatureAudit] map=${mapId} authoritative=${snapshots.length}`,
  );
  for (const creature of snapshots) {
    const worldX = creature.tileX * tileSize + tileSize / 2;
    const worldY = creature.tileY * tileSize + tileSize / 2;
    console.log(creature.instanceId, {
      creatureId: creature.creatureId,
      zoneId: creature.zoneId,
      tile: { x: creature.tileX, y: creature.tileY },
      worldCenter: { x: worldX, y: worldY },
    });
  }
  console.groupEnd();
}

/** Aplica lista autoritativa do state-sync e notifica a cena de exploração. */
export function applyServerWorldCreatureSnapshots(
  mapId: string,
  snapshots: readonly WorldCreatureSnapshot[],
): void {
  const resolvedMapId = (resolveMapIdFromCreatureSnapshots(snapshots) ?? mapId) as MapId;
  authoritativeByMap.set(resolvedMapId, [...snapshots]);

  const entries = snapshots.map(creatureSnapshotToMonsterEntry);
  syncServerWorldCreatures(resolvedMapId, entries);

  logCreatureIntegrityAudit(resolvedMapId, snapshots);
  listener?.(resolvedMapId);
}

export function parseWorldCreatureSnapshots(raw: unknown): WorldCreatureSnapshot[] | null {
  if (!Array.isArray(raw)) return null;
  const parsed: WorldCreatureSnapshot[] = [];
  for (const item of raw) {
    if (!isValidWorldCreatureSnapshot(item)) return null;
    parsed.push(item);
  }
  return parsed;
}

export function clearAuthoritativeCreatureSnapshots(): void {
  authoritativeByMap.clear();
}
