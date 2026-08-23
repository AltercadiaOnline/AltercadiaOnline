/**
 * Onda do Agente Vórtex — slot de 10 min reais no relógio do servidor.
 * Caçada no beco: entra na borda/meio, persegue, luta obrigatória, some em 1 min.
 */

import { getCreatureDropEntry } from '../items/creatureDrops.js';
import { resolveMapTileSize } from '../world/activeMapTileSize.js';
import { clearCreatureAiRuntime } from '../world/creatureAiTick.js';
import { resolveCreatureHitboxPx } from '../world/creatureWanderConfig.js';
import { isMapId, type MapId } from '../world/mapRegistry.js';
import { tileCenterToWorldPixel } from '../world/portals.js';
import { isMonsterDefeated } from '../world/defeatedMonsterState.js';
import {
  despawnWorldMonster,
  getWorldMonsterEntryRaw,
  upsertWorldMonster,
} from '../world/worldMonsterInstances.js';
import {
  getStaticDistrictDef,
  isStaticDistrictId,
  type StaticDistrictId,
  type StaticTileBounds,
} from './staticDistrictCatalog.js';
import { staticDistrictStore } from './staticDistrictStore.js';

export const VORTEX_AGENT_CREATURE_ID = 'vortex_agent' as const;
export const VORTEX_AGENT_INSTANCE_PREFIX = 'vortex_agent:' as const;

/** Só o beco caça — cidade não entra na onda. */
export const VORTEX_HUNT_DISTRICT_IDS = [
  'farm_alley_north',
  'farm_alley_south',
] as const satisfies readonly StaticDistrictId[];

/** Marcas :00 / :10 / :20 / :30 / :40 / :50 do relógio real (UTC). */
export const STATIC_AGENT_WAVE_INTERVAL_MS = 10 * 60 * 1000;
export const STATIC_AGENT_WAVE_APPEAR_CHANCE = 50;
/** Sem batalha neste prazo → some até o próximo slot. */
export const VORTEX_HUNT_TIMEOUT_MS = 60_000;

export type VortexIngressKind = 'north' | 'south' | 'middle';

const huntStartedAtMs = new Map<string, number>();

export function isVortexHuntDistrictId(id: string): id is (typeof VORTEX_HUNT_DISTRICT_IDS)[number] {
  return (VORTEX_HUNT_DISTRICT_IDS as readonly string[]).includes(id);
}

export function isVortexAgentCreatureId(creatureId: string): boolean {
  return creatureId === VORTEX_AGENT_CREATURE_ID;
}

export function isVortexAgentInstanceId(monsterId: string): boolean {
  return monsterId.startsWith(VORTEX_AGENT_INSTANCE_PREFIX);
}

export function buildVortexAgentInstanceId(districtId: StaticDistrictId): string {
  return `${VORTEX_AGENT_INSTANCE_PREFIX}${districtId}`;
}

export function resolveVortexAgentDistrictId(monsterId: string): StaticDistrictId | null {
  if (!isVortexAgentInstanceId(monsterId)) return null;
  const id = monsterId.slice(VORTEX_AGENT_INSTANCE_PREFIX.length);
  return isStaticDistrictId(id) ? id : null;
}

export function resolveAgentWaveSlotIndex(nowMs: number): number {
  return Math.floor(Math.max(0, nowMs) / STATIC_AGENT_WAVE_INTERVAL_MS);
}

export function resolveAgentWaveSlotEndMs(nowMs: number): number {
  return (resolveAgentWaveSlotIndex(nowMs) + 1) * STATIC_AGENT_WAVE_INTERVAL_MS;
}

function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function rollVortexAgentAppears(
  slotIndex: number,
  districtId: StaticDistrictId,
  shardSalt: string,
): boolean {
  const hash = hashSeed(`${slotIndex}:${districtId}:${shardSalt}`);
  return hash % 100 < STATIC_AGENT_WAVE_APPEAR_CHANCE;
}

export function pickVortexIngressKind(
  slotIndex: number,
  districtId: StaticDistrictId,
  shardSalt: string,
): VortexIngressKind {
  const roll = hashSeed(`ingress:${slotIndex}:${districtId}:${shardSalt}`) % 3;
  if (roll === 0) return 'north';
  if (roll === 1) return 'south';
  return 'middle';
}

export function resolveVortexIngressTile(
  bounds: StaticTileBounds,
  kind: VortexIngressKind,
): { readonly tileX: number; readonly tileY: number } {
  const midX = Math.floor((bounds.tileX0 + bounds.tileX1) / 2);
  const midY = Math.floor((bounds.tileY0 + bounds.tileY1) / 2);
  if (kind === 'north') return { tileX: midX, tileY: bounds.tileY0 };
  if (kind === 'south') return { tileX: midX, tileY: bounds.tileY1 };
  return { tileX: midX, tileY: midY };
}

function markHuntStart(instanceId: string, nowMs: number): void {
  if (!huntStartedAtMs.has(instanceId)) {
    huntStartedAtMs.set(instanceId, nowMs);
  }
}

function clearHuntStart(instanceId: string): void {
  huntStartedAtMs.delete(instanceId);
}

/** Batalha começou — o timer de 1 min deixa de valer. */
export function noteVortexHuntBattleStarted(monsterId: string): void {
  if (isVortexAgentInstanceId(monsterId)) {
    clearHuntStart(monsterId);
  }
}

function spawnVortexAgent(
  districtId: StaticDistrictId,
  slotIndex: number,
  shardSalt: string,
  nowMs: number,
): void {
  const def = getStaticDistrictDef(districtId);
  if (!def || !isMapId(def.mapId)) return;
  const kind = pickVortexIngressKind(slotIndex, districtId, shardSalt);
  const home = resolveVortexIngressTile(def.bounds, kind);
  const tileSize = resolveMapTileSize(def.mapId);
  const feet = tileCenterToWorldPixel(home.tileX, home.tileY, tileSize);
  const name = getCreatureDropEntry(VORTEX_AGENT_CREATURE_ID)?.creatureName ?? 'Agente Vórtex';
  const instanceId = buildVortexAgentInstanceId(districtId);
  upsertWorldMonster({
    id: instanceId,
    name,
    mapId: def.mapId,
    tileX: home.tileX,
    tileY: home.tileY,
    worldX: feet.x,
    worldY: feet.y,
    homeTileX: home.tileX,
    homeTileY: home.tileY,
    facing: 'south',
    hitboxPx: resolveCreatureHitboxPx(VORTEX_AGENT_CREATURE_ID),
    creatureId: VORTEX_AGENT_CREATURE_ID,
  });
  markHuntStart(instanceId, nowMs);
}

function despawnVortexAgent(districtId: StaticDistrictId): void {
  const id = buildVortexAgentInstanceId(districtId);
  clearCreatureAiRuntime(id);
  clearHuntStart(id);
  despawnWorldMonster(id);
}

function restoreLiveAgentIfNeeded(
  districtId: StaticDistrictId,
  slotIndex: number,
  shardSalt: string,
  nowMs: number,
): boolean {
  const id = buildVortexAgentInstanceId(districtId);
  if (getWorldMonsterEntryRaw(id)) return false;
  if (isMonsterDefeated(id)) return false;
  spawnVortexAgent(districtId, slotIndex, shardSalt, nowMs);
  return true;
}

function expireTimedOutHunts(nowMs: number, dirty: Set<MapId>): void {
  for (const districtId of VORTEX_HUNT_DISTRICT_IDS) {
    const instanceId = buildVortexAgentInstanceId(districtId);
    const started = huntStartedAtMs.get(instanceId);
    if (started === undefined) continue;
    if (nowMs - started < VORTEX_HUNT_TIMEOUT_MS) continue;
    if (!getWorldMonsterEntryRaw(instanceId) && isMonsterDefeated(instanceId)) {
      clearHuntStart(instanceId);
      continue;
    }
    const runtime = staticDistrictStore.getRuntime(districtId);
    const def = getStaticDistrictDef(districtId);
    despawnVortexAgent(districtId);
    if (runtime) {
      staticDistrictStore.applyAgentWave(districtId, [], runtime.nextWaveAtMs);
    }
    if (def) dirty.add(def.mapId);
  }
}

/**
 * Aplica a onda atual. Idempotente dentro do mesmo slot.
 * Retorna mapas cujo snapshot de criaturas mudou.
 */
export function tickVortexAgentWaves(
  nowMs: number,
  shardSalt: string,
): readonly MapId[] {
  const slotIndex = resolveAgentWaveSlotIndex(nowMs);
  const slotEndMs = resolveAgentWaveSlotEndMs(nowMs);
  const dirty = new Set<MapId>();

  for (const districtId of VORTEX_HUNT_DISTRICT_IDS) {
    const def = getStaticDistrictDef(districtId);
    const runtime = staticDistrictStore.getRuntime(districtId);
    if (!def || !runtime) continue;

    if (nowMs < runtime.nextWaveAtMs) {
      if (runtime.agentInstanceIds.length > 0) {
        if (restoreLiveAgentIfNeeded(districtId, slotIndex, shardSalt, nowMs)) {
          dirty.add(def.mapId);
        }
      }
      continue;
    }

    const appears = rollVortexAgentAppears(slotIndex, districtId, shardSalt);
    const instanceId = buildVortexAgentInstanceId(districtId);
    if (appears) {
      spawnVortexAgent(districtId, slotIndex, shardSalt, nowMs);
      staticDistrictStore.applyAgentWave(districtId, [instanceId], slotEndMs);
    } else {
      despawnVortexAgent(districtId);
      staticDistrictStore.applyAgentWave(districtId, [], slotEndMs);
    }
    dirty.add(def.mapId);
  }

  expireTimedOutHunts(nowMs, dirty);
  return [...dirty];
}

/** @internal testes */
export function __resetVortexHuntRuntimeForTests(): void {
  huntStartedAtMs.clear();
}
