import { ZoneId } from '../items/itemTypes.js';
import { getCreatureDropEntry } from '../items/creatureDrops.js';
import type { MapId } from './mapRegistry.js';
import type { MonsterRegistryEntry } from './monsterRegistry.js';
import { getActiveMonstersForMap } from './worldMonsterInstances.js';
import {
  CREATURE_INTEREST_RADIUS_TILES,
  chebyshevTileDistance,
} from './creatureWanderConfig.js';
import { worldPixelToTile } from './portals.js';

/** Snapshot autoritativo de criatura no mundo — enviado via state-sync. */
export type WorldCreatureSnapshot = {
  readonly instanceId: string;
  readonly creatureId: string;
  readonly name: string;
  readonly mapId: string;
  readonly tileX: number;
  readonly tileY: number;
  readonly zoneId: ZoneId;
  readonly worldX?: number;
  readonly worldY?: number;
  readonly homeTileX?: number;
  readonly homeTileY?: number;
  readonly facing?: 'south' | 'north' | 'east' | 'west';
  readonly hitboxPx?: number;
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
    ...(entry.worldX !== undefined ? { worldX: entry.worldX } : {}),
    ...(entry.worldY !== undefined ? { worldY: entry.worldY } : {}),
    ...(entry.homeTileX !== undefined ? { homeTileX: entry.homeTileX } : {}),
    ...(entry.homeTileY !== undefined ? { homeTileY: entry.homeTileY } : {}),
    ...(entry.facing !== undefined ? { facing: entry.facing } : {}),
    ...(entry.hitboxPx !== undefined ? { hitboxPx: entry.hitboxPx } : {}),
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
    ...(snapshot.worldX !== undefined ? { worldX: snapshot.worldX } : {}),
    ...(snapshot.worldY !== undefined ? { worldY: snapshot.worldY } : {}),
    ...(snapshot.homeTileX !== undefined ? { homeTileX: snapshot.homeTileX } : {}),
    ...(snapshot.homeTileY !== undefined ? { homeTileY: snapshot.homeTileY } : {}),
    ...(snapshot.facing !== undefined ? { facing: snapshot.facing } : {}),
    ...(snapshot.hitboxPx !== undefined ? { hitboxPx: snapshot.hitboxPx } : {}),
  };
}

/** Lista criaturas ativas do mapa para o pacote SYNC (servidor = fonte da verdade). */
export function buildWorldCreaturesForMap(mapId: MapId): readonly WorldCreatureSnapshot[] {
  return getActiveMonstersForMap(mapId).map(monsterEntryToCreatureSnapshot);
}

/** Só criaturas na AOI da câmera do observador (player centrado 640×360 + margem). */
export function buildWorldCreaturesNearObserver(
  mapId: MapId,
  observerWorldX: number,
  observerWorldY: number,
  radiusTiles: number = CREATURE_INTEREST_RADIUS_TILES,
): readonly WorldCreatureSnapshot[] {
  const observer = worldPixelToTile(observerWorldX, observerWorldY);
  return getActiveMonstersForMap(mapId)
    .filter((entry) =>
      chebyshevTileDistance(observer.tileX, observer.tileY, entry.tileX, entry.tileY) <= radiusTiles,
    )
    .map(monsterEntryToCreatureSnapshot);
}

function isOptionalFiniteNumber(value: unknown): boolean {
  return value === undefined || (typeof value === 'number' && Number.isFinite(value));
}

function isOptionalFacing(value: unknown): boolean {
  return (
    value === undefined
    || value === 'south'
    || value === 'north'
    || value === 'east'
    || value === 'west'
  );
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
    && isOptionalFiniteNumber(record.worldX)
    && isOptionalFiniteNumber(record.worldY)
    && isOptionalFiniteNumber(record.homeTileX)
    && isOptionalFiniteNumber(record.homeTileY)
    && isOptionalFacing(record.facing)
    && isOptionalFiniteNumber(record.hitboxPx)
  );
}
