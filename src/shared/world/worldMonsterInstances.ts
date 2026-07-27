import type { MapId } from './mapRegistry.js';
import { FARM_ZONE_01_ID } from './maps/farm_zone_01.js';
import type { MonsterRegistryEntry } from './monsterRegistry.js';
import {
  clearDefeatedMonsters,
  clearMonsterDefeated,
  isMonsterDefeated,
  markMonsterDefeated,
} from './defeatedMonsterState.js';
import { buildZone1ConstructMonsterInstances } from './zone1MonsterSpawns.js';
import { isHuntZoneMapId } from './zoneLoad/zoneLoadTypes.js';

const activeById = new Map<string, MonsterRegistryEntry>();
/** Zonas cujo seed de monstros já rodou (hunt sob demanda). */
const monsterRuntimeLoaded = new Set<MapId>();

function seedZone1Monsters(): void {
  if (monsterRuntimeLoaded.has(FARM_ZONE_01_ID)) return;
  for (const entry of buildZone1ConstructMonsterInstances()) {
    activeById.set(entry.id, entry);
  }
  monsterRuntimeLoaded.add(FARM_ZONE_01_ID);
}

export function resetWorldMonsterInstances(): void {
  activeById.clear();
  clearDefeatedMonsters();
  monsterRuntimeLoaded.clear();
}

/**
 * Garante runtime de monstros da zona (idempotente).
 * `farm_zone_01` → seed Zone1; cidade não tem seed de criaturas.
 */
export function ensureHuntZoneLoaded(mapId: MapId): void {
  if (mapId === FARM_ZONE_01_ID || isHuntZoneMapId(mapId)) {
    seedZone1Monsters();
    return;
  }
  monsterRuntimeLoaded.add(mapId);
}

export function isZoneMonsterRuntimeLoaded(mapId: MapId): boolean {
  return monsterRuntimeLoaded.has(mapId);
}

/**
 * @deprecated Não semeia mais Zone1 automaticamente.
 * Use `ensureHuntZoneLoaded` / ZoneLoadGateway após city ready ou portal.
 * Mantido como no-op seguro para call sites legados.
 */
export function ensureWorldMonsterInstances(): void {
  // no-op — seed só via ensureHuntZoneLoaded
}

/** Entrada bruta (ignora defeated) — usado pelo scheduler de respawn no servidor. */
export function getWorldMonsterEntryRaw(monsterId: string): MonsterRegistryEntry | undefined {
  return activeById.get(monsterId);
}

export function getWorldMonsterEntry(monsterId: string): MonsterRegistryEntry | undefined {
  const entry = activeById.get(monsterId);
  if (!entry || isMonsterDefeated(monsterId)) return undefined;
  return entry;
}

export function getActiveMonstersForMap(mapId: MapId): readonly MonsterRegistryEntry[] {
  return [...activeById.values()].filter(
    (entry) => entry.mapId === mapId && !isMonsterDefeated(entry.id),
  );
}

/**
 * Remove do mapa ativo após vitória.
 * No servidor preferir `scheduleWorldMonsterRespawn` (volta em 3 min).
 * No cliente: some na hora; respawn chega via state-sync.
 */
export function removeActiveWorldMonster(monsterId: string): void {
  activeById.delete(monsterId);
  markMonsterDefeated(monsterId);
  onMonsterPoseChanged?.(monsterId);
}

/** Servidor: marca derrotado e tira do ativo, mantendo id para respawn. */
export function stashWorldMonsterForRespawn(monsterId: string): MonsterRegistryEntry | undefined {
  const entry = activeById.get(monsterId);
  if (!entry) {
    markMonsterDefeated(monsterId);
    return undefined;
  }
  activeById.delete(monsterId);
  markMonsterDefeated(monsterId);
  onMonsterPoseChanged?.(monsterId);
  return entry;
}

/** Servidor / sync: reativa monstro após timer de respawn. */
export function restoreWorldMonsterAfterRespawn(entry: MonsterRegistryEntry): void {
  clearMonsterDefeated(entry.id);
  activeById.set(entry.id, entry);
  monsterRuntimeLoaded.add(entry.mapId);
  onMonsterPoseChanged?.(entry.id);
}

export function listActiveWorldMonsterIds(mapId: MapId): readonly string[] {
  return getActiveMonstersForMap(mapId).map((entry) => entry.id);
}

/** @internal — dirty sync hook (servidor liga markCreatureSyncDirty). */
let onMonsterPoseChanged: ((monsterId: string) => void) | null = null;

export function setWorldMonsterPoseDirtyListener(
  listener: ((monsterId: string) => void) | null,
): void {
  onMonsterPoseChanged = listener;
}

/** Atualiza pose autoritativa (movimento / AI) — servidor ou simulação local. */
export function updateWorldMonsterPose(
  monsterId: string,
  patch: {
    readonly tileX: number;
    readonly tileY: number;
    readonly worldX: number;
    readonly worldY: number;
    readonly facing?: MonsterRegistryEntry['facing'];
  },
): MonsterRegistryEntry | undefined {
  const current = activeById.get(monsterId);
  if (!current || isMonsterDefeated(monsterId)) return undefined;

  const next: MonsterRegistryEntry = {
    ...current,
    tileX: patch.tileX,
    tileY: patch.tileY,
    worldX: patch.worldX,
    worldY: patch.worldY,
    homeTileX: current.homeTileX ?? current.tileX,
    homeTileY: current.homeTileY ?? current.tileY,
    ...(patch.facing !== undefined ? { facing: patch.facing } : {}),
    ...(current.hitboxPx !== undefined ? { hitboxPx: current.hitboxPx } : {}),
  };
  activeById.set(monsterId, next);
  onMonsterPoseChanged?.(monsterId);
  return next;
}

/** Lista todas as criaturas ativas (todos os mapas) — tick de AI. */
export function listAllActiveWorldMonsters(): readonly MonsterRegistryEntry[] {
  return [...activeById.values()].filter((entry) => !isMonsterDefeated(entry.id));
}

/** Substitui criaturas de um mapa com lista autoritativa do servidor (state-sync). */
export function syncServerWorldCreatures(
  mapId: MapId,
  entries: readonly MonsterRegistryEntry[],
): void {
  for (const [id, entry] of activeById) {
    if (entry.mapId === mapId) {
      activeById.delete(id);
    }
  }
  for (const entry of entries) {
    if (entry.mapId !== mapId) continue;
    clearMonsterDefeated(entry.id);
    activeById.set(entry.id, entry);
  }
  if (entries.length > 0) {
    monsterRuntimeLoaded.add(mapId);
  }
}
