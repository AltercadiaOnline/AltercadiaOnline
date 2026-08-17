/**
 * Acesso ao púlpito PvP ranqueado — servidor valida pose autoritativa.
 * Cliente só abre o painel no raio de interação; isto impede join remoto.
 */

import { TILE_SIZE } from '../../world/mapConstants.js';
import { getMapDefinition } from '../../world/mapRegistry.js';
import { getResolvedNpcRegistry } from '../../world/npcRegistry.js';
import {
  PVP_RANKED_STATION_ID,
  PVP_RANKED_STATION_MAX_RANGE_TILES,
} from './pvpRankedQueueConfig.js';
import type { PvpRankedQueueErrorCode } from './pvpRankedQueueProtocol.js';

export type PvpRankedStationAccessCheck = {
  readonly mapId: string;
  readonly worldX: number;
  readonly worldY: number;
  readonly stationId?: string;
};

export type PvpRankedStationAccessResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: Extract<PvpRankedQueueErrorCode, 'INVALID_STATION' | 'NOT_NEAR_STATION'> };

function resolveMapTileSize(mapId: string): number {
  return getMapDefinition(mapId)?.tileSize ?? TILE_SIZE;
}

function tileDistanceToNpc(
  worldX: number,
  worldY: number,
  npcTileX: number,
  npcTileY: number,
  mapId: string,
): number {
  const tileSize = resolveMapTileSize(mapId);
  const playerTileX = worldX / tileSize;
  const playerTileY = worldY / tileSize;
  return Math.hypot(playerTileX - npcTileX, playerTileY - npcTileY);
}

/** Pose do mundo precisa estar no púlpito `combate_pvp` do mapa da estação. */
export function validatePvpRankedStationAccess(
  check: PvpRankedStationAccessCheck,
): PvpRankedStationAccessResult {
  const stationId = check.stationId || PVP_RANKED_STATION_ID;
  if (stationId !== PVP_RANKED_STATION_ID) {
    return { ok: false, reason: 'INVALID_STATION' };
  }

  const entry = getResolvedNpcRegistry().find((npc) => npc.id === stationId);
  if (!entry || entry.mapId !== check.mapId) {
    return { ok: false, reason: 'NOT_NEAR_STATION' };
  }

  const distance = tileDistanceToNpc(
    check.worldX,
    check.worldY,
    entry.tileX,
    entry.tileY,
    check.mapId,
  );

  if (distance > PVP_RANKED_STATION_MAX_RANGE_TILES) {
    return { ok: false, reason: 'NOT_NEAR_STATION' };
  }

  return { ok: true };
}
