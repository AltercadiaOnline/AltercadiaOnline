import { ZoneId } from '../items/itemTypes.js';
import { getCreatureDropEntry } from '../items/creatureDrops.js';
import type { MapId } from './mapRegistry.js';
import type { MonsterRegistryEntry } from './monsterRegistry.js';
import { getActiveMonstersForMap, ensureWorldMonsterInstances } from './worldMonsterInstances.js';

/** Snapshot autoritativo de criatura no mundo — enviado via state-sync. */
export type WorldCreatureSnapshot = {
  readonly instanceId: string;
  readonly creatureId: string;
  readonly name: string;
  readonly mapId: string;
  readonly tileX: number;
  readonly tileY: number;
  readonly zoneId: ZoneId;
};

export function resolveCreatureZoneId(creatureId: string): ZoneId {
  return getCreatureDropEntry(creatureId)?.zoneId ?? ZoneId.Zone1;
}

export function monsterEntryToCreatureSnapshot(entry: MonsterRegistryEntry): WorldCreatureSnapshot {
  return {
    instanceId: entry.id,
    creatureId: entry.creatureId,
    name: entry.name,
    mapId: entry.mapId,
    tileX: entry.tileX,
    tileY: entry.tileY,
    zoneId: resolveCreatureZoneId(entry.creatureId),
  };
}

export function creatureSnapshotToMonsterEntry(snapshot: WorldCreatureSnapshot): MonsterRegistryEntry {
  return {
    id: snapshot.instanceId,
    creatureId: snapshot.creatureId,
    name: snapshot.name,
    mapId: snapshot.mapId as MapId,
    tileX: snapshot.tileX,
    tileY: snapshot.tileY,
  };
}

/** Lista criaturas ativas do mapa para o pacote SYNC (servidor = fonte da verdade). */
export function buildWorldCreaturesForMap(mapId: MapId): readonly WorldCreatureSnapshot[] {
  ensureWorldMonsterInstances();
  return getActiveMonstersForMap(mapId).map(monsterEntryToCreatureSnapshot);
}

export function isValidWorldCreatureSnapshot(value: unknown): value is WorldCreatureSnapshot {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.instanceId === 'string'
    && typeof record.creatureId === 'string'
    && typeof record.name === 'string'
    && typeof record.mapId === 'string'
    && typeof record.tileX === 'number'
    && Number.isFinite(record.tileX)
    && typeof record.tileY === 'number'
    && Number.isFinite(record.tileY)
    && typeof record.zoneId === 'string'
  );
}
