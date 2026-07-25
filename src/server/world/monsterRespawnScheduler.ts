/**
 * Respawn PVE — após morte, monstro volta ao home após CREATURE_RESPAWN_MS.
 * Só o servidor agenda; o cliente espelha via state-sync.
 */

import { CREATURE_RESPAWN_MS } from '../../shared/world/creatureWanderConfig.js';
import { resolveMapTileSize } from '../../shared/world/activeMapTileSize.js';
import { isMapId } from '../../shared/world/mapRegistry.js';
import type { MonsterRegistryEntry } from '../../shared/world/monsterRegistry.js';
import { tileCenterToWorldPixel } from '../../shared/world/portals.js';
import {
  getWorldMonsterEntryRaw,
  restoreWorldMonsterAfterRespawn,
  stashWorldMonsterForRespawn,
} from '../../shared/world/worldMonsterInstances.js';
import { clearCreatureAiRuntime } from './creatureAiTick.js';
import { releasePveMonsterClaim } from './pveMonsterClaim.js';

type PendingRespawn = {
  readonly template: MonsterRegistryEntry;
  readonly respawnAtMs: number;
};

const pendingById = new Map<string, PendingRespawn>();

function buildHomeTemplate(entry: MonsterRegistryEntry): MonsterRegistryEntry {
  const homeTileX = entry.homeTileX ?? entry.tileX;
  const homeTileY = entry.homeTileY ?? entry.tileY;
  const tileSize = isMapId(entry.mapId) ? resolveMapTileSize(entry.mapId) : 32;
  const feet = tileCenterToWorldPixel(homeTileX, homeTileY, tileSize);
  return {
    ...entry,
    tileX: homeTileX,
    tileY: homeTileY,
    worldX: feet.x,
    worldY: feet.y,
    homeTileX,
    homeTileY,
    facing: 'south',
  };
}

/** Derrota PVE: some do mapa e agenda volta ao spawn. */
export function scheduleWorldMonsterRespawn(
  monsterId: string,
  nowMs: number = Date.now(),
): void {
  const live = getWorldMonsterEntryRaw(monsterId);
  if (!live) {
    releasePveMonsterClaim(monsterId);
    return;
  }

  const template = buildHomeTemplate(live);
  stashWorldMonsterForRespawn(monsterId);
  releasePveMonsterClaim(monsterId);
  clearCreatureAiRuntime(monsterId);

  pendingById.set(monsterId, {
    template,
    respawnAtMs: nowMs + CREATURE_RESPAWN_MS,
  });
}

/** Tick — restaura monstros cujo timer venceu. */
export function tickWorldMonsterRespawns(nowMs: number): void {
  for (const [monsterId, pending] of pendingById) {
    if (nowMs < pending.respawnAtMs) continue;
    pendingById.delete(monsterId);
    restoreWorldMonsterAfterRespawn(pending.template);
  }
}

export function __resetMonsterRespawnsForTests(): void {
  pendingById.clear();
}
