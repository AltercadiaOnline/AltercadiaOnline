/**
 * Runtime de movimento PVE — estado leve por instância (servidor).
 * Cliente só recebe tiles/world via WorldCreatureSnapshot.
 */

import {
  CREATURE_INTEREST_RADIUS_TILES,
  CREATURE_WANDER_STEP_JITTER_MS,
  chebyshevTileDistance,
  isWithinCreatureLeash,
  pickCreatureLeashAwareWanderDelta,
  pickCreatureStepToward,
  resolveCreatureWanderProfile,
  type CreatureCardinalFacing,
} from '../../shared/world/creatureWanderConfig.js';
import { resolveMapTileSize } from '../../shared/world/activeMapTileSize.js';
import {
  listAllActiveWorldMonsters,
  updateWorldMonsterPose,
} from '../../shared/world/worldMonsterInstances.js';
import type { MonsterRegistryEntry } from '../../shared/world/monsterRegistry.js';
import { isMapId } from '../../shared/world/mapRegistry.js';
import { tileCenterToWorldPixel, worldPixelToTile } from '../../shared/world/portals.js';
import { isMonsterEncounterClaimed } from './pveMonsterClaim.js';

type CreatureAiRuntime = {
  nextStepAtMs: number;
  homeTileX: number;
  homeTileY: number;
};

const runtimeById = new Map<string, CreatureAiRuntime>();

export type CreatureAiPlayerProbe = {
  readonly playerId: string;
  readonly characterId: number;
  readonly mapId: string;
  readonly worldX: number;
  readonly worldY: number;
};

function ensureRuntime(entry: MonsterRegistryEntry, nowMs: number): CreatureAiRuntime {
  const existing = runtimeById.get(entry.id);
  if (existing) return existing;

  const homeTileX = entry.homeTileX ?? entry.tileX;
  const homeTileY = entry.homeTileY ?? entry.tileY;
  const jitter = Math.floor(Math.random() * CREATURE_WANDER_STEP_JITTER_MS);
  const created: CreatureAiRuntime = {
    homeTileX,
    homeTileY,
    nextStepAtMs: nowMs + jitter,
  };
  runtimeById.set(entry.id, created);
  return created;
}

function facingToward(dTileX: number, dTileY: number, fallback: CreatureCardinalFacing): CreatureCardinalFacing {
  if (Math.abs(dTileX) >= Math.abs(dTileY)) {
    if (dTileX > 0) return 'east';
    if (dTileX < 0) return 'west';
  } else {
    if (dTileY > 0) return 'south';
    if (dTileY < 0) return 'north';
  }
  return fallback;
}

function applyStep(
  entry: MonsterRegistryEntry,
  runtime: CreatureAiRuntime,
  nextTileX: number,
  nextTileY: number,
  facing: CreatureCardinalFacing,
  leashTiles: number,
): void {
  if (!isWithinCreatureLeash(runtime.homeTileX, runtime.homeTileY, nextTileX, nextTileY, leashTiles)) {
    return;
  }
  if (!isMapId(entry.mapId)) return;

  const tileSize = resolveMapTileSize(entry.mapId);
  const feet = tileCenterToWorldPixel(nextTileX, nextTileY, tileSize);
  updateWorldMonsterPose(entry.id, {
    tileX: nextTileX,
    tileY: nextTileY,
    worldX: feet.x,
    worldY: feet.y,
    facing,
  });
}

function findNearestPlayerOnMap(
  entry: MonsterRegistryEntry,
  players: readonly CreatureAiPlayerProbe[],
): { readonly tileX: number; readonly tileY: number; readonly distance: number } | null {
  let best: { tileX: number; tileY: number; distance: number } | null = null;
  for (const player of players) {
    if (player.mapId !== entry.mapId) continue;
    const tile = worldPixelToTile(player.worldX, player.worldY);
    const distance = chebyshevTileDistance(entry.tileX, entry.tileY, tile.tileX, tile.tileY);
    if (!best || distance < best.distance) {
      best = { tileX: tile.tileX, tileY: tile.tileY, distance };
    }
  }
  return best;
}

function isMonsterNearAnyPlayer(
  entry: MonsterRegistryEntry,
  players: readonly CreatureAiPlayerProbe[],
): boolean {
  for (const player of players) {
    if (player.mapId !== entry.mapId) continue;
    const tile = worldPixelToTile(player.worldX, player.worldY);
    const distance = chebyshevTileDistance(entry.tileX, entry.tileY, tile.tileX, tile.tileY);
    if (distance <= CREATURE_INTEREST_RADIUS_TILES) return true;
  }
  return false;
}

/**
 * Tick de AI — só criaturas na AOI de algum player explorando (câmera).
 * Longe: dorme. Perto: ronda / aggro (perfil por espécie).
 */
export function tickCreatureWanderAi(
  nowMs: number,
  players: readonly CreatureAiPlayerProbe[],
): void {
  if (players.length === 0) return;

  for (const entry of listAllActiveWorldMonsters()) {
    if (isMonsterEncounterClaimed(entry.id)) continue;
    if (!isMonsterNearAnyPlayer(entry, players)) continue;

    const profile = resolveCreatureWanderProfile(entry.creatureId);
    const runtime = ensureRuntime(entry, nowMs);
    if (nowMs < runtime.nextStepAtMs) continue;

    const interval =
      profile.wanderStepIntervalMs
      + Math.floor(Math.random() * CREATURE_WANDER_STEP_JITTER_MS)
      - CREATURE_WANDER_STEP_JITTER_MS / 2;
    runtime.nextStepAtMs = nowMs + Math.max(800, interval);

    const nearest = findNearestPlayerOnMap(entry, players);
    const currentFacing = entry.facing ?? 'south';

    if (
      nearest
      && nearest.distance > profile.encounterRadiusTiles
      && nearest.distance <= profile.aggroDetectTiles
    ) {
      const step = pickCreatureStepToward(
        nearest.tileX - entry.tileX,
        nearest.tileY - entry.tileY,
      );
      applyStep(
        entry,
        runtime,
        entry.tileX + step.dTileX,
        entry.tileY + step.dTileY,
        facingToward(step.dTileX, step.dTileY, currentFacing),
        profile.leashTiles,
      );
      continue;
    }

    const wander = pickCreatureLeashAwareWanderDelta(
      runtime.homeTileX,
      runtime.homeTileY,
      entry.tileX,
      entry.tileY,
      profile.leashTiles,
    );
    applyStep(
      entry,
      runtime,
      entry.tileX + wander.dTileX,
      entry.tileY + wander.dTileY,
      wander.facing,
      profile.leashTiles,
    );
  }
}

export function clearCreatureAiRuntime(monsterId?: string): void {
  if (monsterId) {
    runtimeById.delete(monsterId);
    return;
  }
  runtimeById.clear();
}

/** @internal tests */
export function __resetCreatureAiForTests(): void {
  runtimeById.clear();
}
