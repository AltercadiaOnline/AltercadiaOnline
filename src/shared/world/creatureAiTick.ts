/**
 * Runtime de movimento PVE — estado leve por instância.
 * Servidor e simulação local usam o mesmo tick + `creatureWanderConfig`
 * (leash ~2 tiles, passo ~2s). Online só recebe poses via snapshot.
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
} from './creatureWanderConfig.js';
import { resolveMapTileSize } from './activeMapTileSize.js';
import {
  listAllActiveWorldMonsters,
  updateWorldMonsterPose,
} from './worldMonsterInstances.js';
import type { MonsterRegistryEntry } from './monsterRegistry.js';
import { isMapId } from './mapRegistry.js';
import { tileCenterToWorldPixel, worldPixelToTile } from './portals.js';
import {
  isStaticDistrictId,
  isTileInStaticDistrict,
} from '../static/staticDistrictCatalog.js';

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

export type TickCreatureWanderAiOptions = {
  /** Online: claim HUD/combate. Local: pending offer. */
  readonly isEncounterClaimed?: (monsterInstanceId: string) => boolean;
  /** Servidor: marca AOI dirty quando a criatura se move. */
  readonly onCreatureMoved?: (monsterInstanceId: string) => void;
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

function isVortexHuntEntry(entry: MonsterRegistryEntry): boolean {
  return entry.creatureId === 'vortex_agent';
}

function applyStep(
  entry: MonsterRegistryEntry,
  runtime: CreatureAiRuntime,
  nextTileX: number,
  nextTileY: number,
  facing: CreatureCardinalFacing,
  leashTiles: number,
  options?: TickCreatureWanderAiOptions,
  unleashed = false,
): boolean {
  if (
    !unleashed
    && !isWithinCreatureLeash(runtime.homeTileX, runtime.homeTileY, nextTileX, nextTileY, leashTiles)
  ) {
    return false;
  }
  if (!isMapId(entry.mapId)) return false;
  if (nextTileX === entry.tileX && nextTileY === entry.tileY && facing === (entry.facing ?? 'south')) {
    return false;
  }

  const tileSize = resolveMapTileSize(entry.mapId);
  const feet = tileCenterToWorldPixel(nextTileX, nextTileY, tileSize);
  updateWorldMonsterPose(entry.id, {
    tileX: nextTileX,
    tileY: nextTileY,
    worldX: feet.x,
    worldY: feet.y,
    facing,
  });
  options?.onCreatureMoved?.(entry.id);
  return true;
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

function findNearestHuntTarget(
  entry: MonsterRegistryEntry,
  players: readonly CreatureAiPlayerProbe[],
): { readonly tileX: number; readonly tileY: number; readonly distance: number } | null {
  const rawDistrict = entry.id.startsWith('vortex_agent:')
    ? entry.id.slice('vortex_agent:'.length)
    : '';
  if (!isStaticDistrictId(rawDistrict)) {
    return findNearestPlayerOnMap(entry, players);
  }
  let best: { tileX: number; tileY: number; distance: number } | null = null;
  for (const player of players) {
    if (player.mapId !== entry.mapId) continue;
    const tile = worldPixelToTile(player.worldX, player.worldY);
    if (!isTileInStaticDistrict(rawDistrict, player.mapId, tile.tileX, tile.tileY)) continue;
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
  if (isVortexHuntEntry(entry)) {
    return players.some((player) => player.mapId === entry.mapId);
  }
  for (const player of players) {
    if (player.mapId !== entry.mapId) continue;
    const tile = worldPixelToTile(player.worldX, player.worldY);
    const distance = chebyshevTileDistance(entry.tileX, entry.tileY, tile.tileX, tile.tileY);
    if (distance <= CREATURE_INTEREST_RADIUS_TILES) return true;
  }
  return false;
}

/**
 * Tick de AI — só criaturas na AOI de algum player explorando.
 * Longe: dorme. Perto: ronda no leash / aggro (perfil por espécie).
 * @returns quantos passos de pose foram aplicados neste tick
 */
export function tickCreatureWanderAi(
  nowMs: number,
  players: readonly CreatureAiPlayerProbe[],
  options: TickCreatureWanderAiOptions = {},
): number {
  if (players.length === 0) return 0;

  const isClaimed = options.isEncounterClaimed;
  let stepped = 0;

  for (const entry of listAllActiveWorldMonsters()) {
    if (isClaimed?.(entry.id)) continue;
    if (!isMonsterNearAnyPlayer(entry, players)) continue;

    const profile = resolveCreatureWanderProfile(entry.creatureId);
    const hunt = isVortexHuntEntry(entry);
    const runtime = ensureRuntime(entry, nowMs);
    if (nowMs < runtime.nextStepAtMs) continue;

    const jitterRange = hunt ? 80 : CREATURE_WANDER_STEP_JITTER_MS;
    const interval =
      profile.wanderStepIntervalMs
      + Math.floor(Math.random() * jitterRange)
      - jitterRange / 2;
    runtime.nextStepAtMs = nowMs + Math.max(hunt ? 160 : 800, interval);

    const nearest = hunt
      ? findNearestHuntTarget(entry, players)
      : findNearestPlayerOnMap(entry, players);
    const currentFacing = entry.facing ?? 'south';

    if (hunt) {
      if (!nearest || nearest.distance <= profile.encounterRadiusTiles) {
        continue;
      }
      const step = pickCreatureStepToward(
        nearest.tileX - entry.tileX,
        nearest.tileY - entry.tileY,
      );
      if (
        applyStep(
          entry,
          runtime,
          entry.tileX + step.dTileX,
          entry.tileY + step.dTileY,
          facingToward(step.dTileX, step.dTileY, currentFacing),
          profile.leashTiles,
          options,
          true,
        )
      ) {
        stepped += 1;
      }
      continue;
    }

    if (
      nearest
      && nearest.distance > profile.encounterRadiusTiles
      && nearest.distance <= profile.aggroDetectTiles
    ) {
      const step = pickCreatureStepToward(
        nearest.tileX - entry.tileX,
        nearest.tileY - entry.tileY,
      );
      if (
        applyStep(
          entry,
          runtime,
          entry.tileX + step.dTileX,
          entry.tileY + step.dTileY,
          facingToward(step.dTileX, step.dTileY, currentFacing),
          profile.leashTiles,
          options,
        )
      ) {
        stepped += 1;
      }
      continue;
    }

    const wander = pickCreatureLeashAwareWanderDelta(
      runtime.homeTileX,
      runtime.homeTileY,
      entry.tileX,
      entry.tileY,
      profile.leashTiles,
    );
    if (
      applyStep(
        entry,
        runtime,
        entry.tileX + wander.dTileX,
        entry.tileY + wander.dTileY,
        wander.facing,
        profile.leashTiles,
        options,
      )
    ) {
      stepped += 1;
    }
  }

  return stepped;
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
